package release

import (
	"fmt"
	"net/http"
	"strings"
	"sync"

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
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	helmAgent, err := c.GetHelmAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	request := &types.UpdateImageBatchRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	releases, err := c.Repo().Release().ListReleasesByImageRepoURI(cluster.ID, request.ImageRepoURI)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("releases not found with given image repo uri"),
			http.StatusBadRequest,
		))

		return
	}

	registries, err := c.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// asynchronously update releases with that image repo uri
	var wg sync.WaitGroup
	mu := &sync.Mutex{}
	errors := make([]string, 0)

	for i := range releases {
		index := i
		wg.Add(1)

		go func() {
			defer wg.Done()
			// read release via agent
			rel, err := helmAgent.GetRelease(releases[index].Name, 0, false)

			if err != nil {
				// if this is a release not found error, just return - the release has likely been deleted from the underlying
				// cluster but has not been deleted from the Porter database yet
				if strings.Contains(err.Error(), "release: not found") {
					return
				}

				mu.Lock()
				errors = append(errors, fmt.Sprintf("Error for %s, index %d: %s", releases[index].Name, index, err.Error()))
				mu.Unlock()
				return
			}

			if rel.Chart.Name() == "job" {
				image := map[string]interface{}{}
				image["repository"] = releases[index].ImageRepoURI
				image["tag"] = request.Tag
				rel.Config["image"] = image
				rel.Config["paused"] = true

				conf := &helm.UpgradeReleaseConfig{
					Name:       releases[index].Name,
					Cluster:    cluster,
					Repo:       c.Repo(),
					Registries: registries,
					Values:     rel.Config,
				}

				_, err = helmAgent.UpgradeReleaseByValues(conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)

				if err != nil {
					// if this is a release not found error, just return - the release has likely been deleted from the underlying
					// cluster in the time since we've read the release, but has not been deleted from the Porter database yet
					if strings.Contains(err.Error(), "release: not found") {
						return
					}

					mu.Lock()
					errors = append(errors, fmt.Sprintf("Error for %s, index %d: %s", releases[index].Name, index, err.Error()))
					mu.Unlock()
				}
			}
		}()
	}

	wg.Wait()

	if len(errors) > 0 {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("errors while deploying: %s", strings.Join(errors, ",")),
			http.StatusBadRequest,
		))

		return
	}
}
