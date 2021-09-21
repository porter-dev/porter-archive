package slack_integration

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type SlackIntegrationDelete struct {
	handlers.PorterHandler
}

func NewSlackIntegrationDelete(
	config *config.Config,
) *SlackIntegrationDelete {
	return &SlackIntegrationDelete{
		PorterHandler: handlers.NewDefaultPorterHandler(config, nil, nil),
	}
}

func (p *SlackIntegrationDelete) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	integrationID, _ := requestutils.GetURLParamUint(r, types.URLParamSlackIntegrationID)

	slackInts, err := p.Repo().SlackIntegration().ListSlackIntegrationsByProjectID(project.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	for _, slackInt := range slackInts {
		if slackInt.ID == integrationID {
			err = p.Repo().SlackIntegration().DeleteSlackIntegration(slackInt.ID)
			if err != nil {
				p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
			w.WriteHeader(http.StatusOK)
			return
		}
	}

	w.WriteHeader(http.StatusNotFound)
}
