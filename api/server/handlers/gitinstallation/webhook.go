package gitinstallation

import (
	"net/http"

	"github.com/porter-dev/porter/internal/telemetry"

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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-new-github-app-webhook")
	defer span.End()

	r = r.Clone(ctx)

	payload, err := github.ValidatePayload(r, []byte(c.Config().GithubAppConf.WebhookSecret))
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error validating payload")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	event, err := github.ParseWebHook(github.WebHookType(r), payload)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error parsing webhook")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
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
					err = telemetry.Error(ctx, span, err, "error creating github app installation")
					c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
					return
				}

				return
			} else if err != nil {
				err = telemetry.Error(ctx, span, err, "error reading github app installation")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}
		}
		if *e.Action == "deleted" {
			err := c.Repo().GithubAppInstallation().DeleteGithubAppInstallationByAccountID(*e.Installation.Account.ID)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error deleting github app installation")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}
		}
	}
}
