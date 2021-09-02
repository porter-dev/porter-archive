package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ListClusterCandidatesHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewListClusterCandidatesHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListClusterCandidatesHandler {
	return &ListClusterCandidatesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *ListClusterCandidatesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	ccs, err := c.Repo().Cluster().ListClusterCandidatesByProjectID(proj.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := make([]*types.ClusterCandidate, 0)

	for _, cc := range ccs {
		res = append(res, cc.ToClusterCandidateType())
	}

	c.WriteResult(w, r, res)
}
