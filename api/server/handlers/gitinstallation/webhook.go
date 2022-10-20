package gitinstallation

import (
	"net/http"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"gorm.io/gorm"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

type GithubAppWebhookHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGithubAppWebhookHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GithubAppWebhookHandler {
	return &GithubAppWebhookHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GithubAppWebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	payload, err := github.ValidatePayload(r, []byte(c.Config().GithubAppConf.WebhookSecret))

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	event, err := github.ParseWebHook(github.WebHookType(r), payload)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	switch e := event.(type) {
	case *github.InstallationEvent:
		if *e.Action == "created" {
			_, err := c.Repo().GithubAppInstallation().ReadGithubAppInstallationByAccountID(*e.Installation.Account.ID)

			if err != nil && err == gorm.ErrRecordNotFound {
				// insert account/installation pair into database
				_, err := c.Repo().GithubAppInstallation().CreateGithubAppInstallation(&ints.GithubAppInstallation{
					AccountID:      *e.Installation.Account.ID,
					InstallationID: *e.Installation.ID,
				})

				if err != nil {
					c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				}

				return
			} else if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
		}
		if *e.Action == "deleted" {
			err := c.Repo().GithubAppInstallation().DeleteGithubAppInstallationByAccountID(*e.Installation.Account.ID)

			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
		}
	}
}
