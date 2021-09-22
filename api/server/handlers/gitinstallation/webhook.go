package gitinstallation

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io/ioutil"
	"net/http"
	"strings"

	"github.com/google/go-github/github"
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
	payload, err := ioutil.ReadAll(r.Body)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// verify webhook secret
	signature := r.Header.Get("X-Hub-Signature-256")

	if !verifySignature([]byte(c.Config().GithubAppConf.WebhookSecret), signature, payload) {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
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

// verifySignature verifies a signature based on hmac protocal
// https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks
func verifySignature(secret []byte, signature string, body []byte) bool {
	if len(signature) != 71 || !strings.HasPrefix(signature, "sha256=") {
		return false
	}

	actual := make([]byte, 32)
	_, err := hex.Decode(actual, []byte(signature[7:]))

	if err != nil {
		return false
	}

	computed := hmac.New(sha256.New, secret)
	_, err = computed.Write(body)

	if err != nil {
		return false
	}

	return hmac.Equal(computed.Sum(nil), actual)
}
