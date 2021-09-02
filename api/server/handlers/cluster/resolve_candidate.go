package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ResolveClusterCandidateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewResolveClusterCandidateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ResolveClusterCandidateHandler {
	return &ResolveClusterCandidateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *ResolveClusterCandidateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project from context
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	ccID, _ := requestutils.GetURLParamUint(r, types.URLParamCandidateID)

	request := &types.ClusterResolverAll{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	cc, err := c.Repo().Cluster().ReadClusterCandidate(proj.ID, ccID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	cluster, cc, err := createClusterFromCandidate(c.Repo(), proj, user, cc)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, cluster.ToClusterType())
}
