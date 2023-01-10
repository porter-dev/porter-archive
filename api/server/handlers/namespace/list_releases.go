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
	request := &types.ListReleasesRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.ReleaseListFilter == nil {
		request.ReleaseListFilter = &types.ReleaseListFilter{}
	}

	namespace := r.Context().Value(types.NamespaceScope).(string)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	helmAgent, err := c.GetHelmAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	releases, err := helmAgent.ListReleases(namespace, request.ReleaseListFilter)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res types.ListReleasesResponse

	for _, helmRel := range releases {
		rel, err := c.Repo().Release().ReadRelease(cluster.ID, helmRel.Name, helmRel.Namespace)

		if err == nil {
			res = append(res, &types.Release{
				Release:       helmRel,
				PorterRelease: rel.ToReleaseType(),
			})
		} else {
			res = append(res, &types.Release{
				Release:       helmRel,
				PorterRelease: &types.PorterRelease{},
			})
		}
	}

	c.WriteResult(w, r, res)
}
