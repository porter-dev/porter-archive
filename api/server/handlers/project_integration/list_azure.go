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

type ListAzureHandler struct {
	handlers.PorterHandlerWriter
}

func NewListAzureHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListAzureHandler {
	return &ListAzureHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ListAzureHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	azInts, err := p.Repo().AzureIntegration().ListAzureIntegrationsByProjectID(project.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res types.ListAzureResponse = make([]*types.AzureIntegration, 0)

	for _, azInt := range azInts {
		res = append(res, azInt.ToAzureIntegrationType())
	}

	p.WriteResult(w, r, res)
}
