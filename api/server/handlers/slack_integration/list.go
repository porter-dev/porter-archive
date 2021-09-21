package slack_integration

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type SlackIntegrationListHandler struct {
	handlers.PorterHandlerWriter
}

func NewSlackIntegrationListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *SlackIntegrationListHandler {
	return &SlackIntegrationListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *SlackIntegrationListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	slackInts, err := p.Repo().SlackIntegration().ListSlackIntegrationsByProjectID(project.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := make(types.ListSlackIntegrationsResponse, 0)

	for _, slackInt := range slackInts {
		res = append(res, slackInt.ToSlackIntegraionType())
	}

	p.WriteResult(w, r, res)
}
