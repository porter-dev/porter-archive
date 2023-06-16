package namespace

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type ListReleasesHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewListReleasesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListReleasesHandler {
	return &ListReleasesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *ListReleasesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-releases")
	defer span.End()

	request := &types.ListReleasesRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.ReleaseListFilter == nil {
		request.ReleaseListFilter = &types.ReleaseListFilter{}
	}

	namespace := ctx.Value(types.NamespaceScope).(string)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "namespace", Value: namespace},
		telemetry.AttributeKV{Key: "cluster_id", Value: cluster.ID},
	)

	helmAgent, err := c.GetHelmAgent(ctx, r, cluster, "")
	if err != nil {
		e := telemetry.Error(ctx, span, err, "failed to get helm agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
		return
	}

	releases, err := helmAgent.ListReleases(ctx, namespace, request.ReleaseListFilter)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "failed to list releases")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
		return
	}

	var res types.ListReleasesResponse

	for _, helmRel := range releases {
		release := types.Release{
			Release: helmRel,
		}
		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "release_name", Value: helmRel.Name},
			telemetry.AttributeKV{Key: "release_namespace", Value: helmRel.Namespace},
		)

		rel, err := c.Repo().Release().ReadRelease(cluster.ID, helmRel.Name, helmRel.Namespace)
		if err != nil {
			telemetry.Error(ctx, span, err, "failed to read release. Not a fatal error")
		}

		if rel != nil {
			release.PorterRelease = rel.ToReleaseType()
		}

	}

	c.WriteResult(w, r, res)
}
