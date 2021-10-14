package project_integration

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ListGCPHandler struct {
	handlers.PorterHandlerWriter
}

func NewListGCPHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListGCPHandler {
	return &ListGCPHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ListGCPHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	gcpInts, err := p.Repo().GCPIntegration().ListGCPIntegrationsByProjectID(project.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res types.ListGCPResponse = make([]*types.GCPIntegration, 0)

	for _, gcpInt := range gcpInts {
		res = append(res, gcpInt.ToGCPIntegrationType())
	}

	p.WriteResult(w, r, res)
}
