package release

import (
	"fmt"
	"net/http"
	"strings"
	"sync"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/models"
)

type UpdateImageBatchHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewUpdateImageBatchHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateImageBatchHandler {
	return &UpdateImageBatchHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *UpdateImageBatchHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-image-batch")
	defer span.End()

	r = r.Clone(ctx)

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	// helmAgent has namespace set from the request
	helmAgent, err := c.GetHelmAgent(ctx, r, cluster, "")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting helm agent")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "namespace", Value: helmAgent.Namespace()})

	request := &types.UpdateImageBatchRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		_ = telemetry.Error(ctx, span, nil, "error decoding and validating request")
		return
	}

	releases, err := c.Repo().Release().ListReleasesByImageRepoURI(cluster.ID, request.ImageRepoURI)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "error listing releases by image repo uri")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("releases not found with given image repo uri"),
			http.StatusBadRequest,
		))

		return
	}

	printReleases := func(releases []*models.Release) string {
		var names []string
		for _, release := range releases {
			names = append(names, fmt.Sprintf("%s-%s", release.Name, release.Namespace))
		}
		return strings.Join(names, ",")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "releases", Value: printReleases(releases)})

	var namespaceScopedReleases []*models.Release
	for _, release := range releases {
		if release.Namespace == helmAgent.Namespace() {
			namespaceScopedReleases = append(namespaceScopedReleases, release)
		}
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "releases-in-namespace", Value: printReleases(namespaceScopedReleases)})

	registries, err := c.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error listing registries by project id")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// asynchronously update releases with that image repo uri
	var wg sync.WaitGroup
	mu := &sync.Mutex{}
	errs := make([]string, 0)

	for i, rel := range namespaceScopedReleases {
		wg.Add(1)

		go func(release *models.Release, i int) {
			defer wg.Done()

			ctx, span := telemetry.NewSpan(ctx, "update-image-batch")
			defer span.End()

			telemetry.WithAttributes(span,
				telemetry.AttributeKV{Key: "release-name", Value: release.Name},
				telemetry.AttributeKV{Key: "release-index", Value: i},
			)

			// read release via agent
			rel, err := helmAgent.GetRelease(ctx, release.Name, 0, false)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error getting release")
				// if this is a release not found error, just return - the release has likely been deleted from the underlying
				// cluster but has not been deleted from the Porter database yet
				if strings.Contains(err.Error(), "release: not found") {
					return
				}

				mu.Lock()
				errs = append(errs, fmt.Sprintf("Error for %s, index %d: %s", release.Name, i, err.Error()))
				mu.Unlock()
				return
			}

			if rel.Chart.Name() == "job" {
				image := map[string]interface{}{}
				image["repository"] = release.ImageRepoURI
				image["tag"] = request.Tag
				rel.Config["image"] = image
				rel.Config["paused"] = true

				conf := &helm.UpgradeReleaseConfig{
					Name:       release.Name,
					Cluster:    cluster,
					Repo:       c.Repo(),
					Registries: registries,
					Values:     rel.Config,
				}

				_, err = helmAgent.UpgradeReleaseByValues(ctx, conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection, false)
				if err != nil {
					err = telemetry.Error(ctx, span, err, "error upgrading release by values")
					// if this is a release not found error, just return - the release has likely been deleted from the underlying
					// cluster in the time since we've read the release, but has not been deleted from the Porter database yet
					if strings.Contains(err.Error(), "release: not found") {
						return
					}

					mu.Lock()
					errs = append(errs, fmt.Sprintf("Error for %s, index %d: %s", release.Name, i, err.Error()))
					mu.Unlock()
				}
			}
		}(rel, i)
	}

	wg.Wait()

	if len(errs) > 0 {
		err = fmt.Errorf("errors while deploying: %s", strings.Join(errs, ","))
		err = telemetry.Error(ctx, span, err, "errors while deploying")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
}
