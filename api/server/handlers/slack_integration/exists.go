package slack_integration

import (
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type SlackIntegrationExists struct {
	handlers.PorterHandler
}

func NewSlackIntegrationExists(
	config *config.Config,
) *SlackIntegrationExists {
	return &SlackIntegrationExists{
		PorterHandler: handlers.NewDefaultPorterHandler(config, nil, nil),
	}
}

func (p *SlackIntegrationExists) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	slackInts, err := p.Repo().SlackIntegration().ListSlackIntegrationsByProjectID(project.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if len(slackInts) != 0 {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusNotFound)
	}
}
