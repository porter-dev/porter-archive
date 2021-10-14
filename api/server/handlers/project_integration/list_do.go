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

type ListDOHandler struct {
	handlers.PorterHandlerWriter
}

func NewListDOHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListDOHandler {
	return &ListDOHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ListDOHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	oauthInts, err := p.Repo().OAuthIntegration().ListOAuthIntegrationsByProjectID(project.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res types.ListOAuthResponse = make([]*types.OAuthIntegration, 0)

	for _, oauthInt := range oauthInts {
		if oauthInt.Client == types.OAuthDigitalOcean {
			res = append(res, oauthInt.ToOAuthIntegrationType())
		}
	}

	p.WriteResult(w, r, res)
}
