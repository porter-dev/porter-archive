package oauth_callback

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models/integrations"
	"gorm.io/gorm"
)

type OAuthCallbackGitlabHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewOAuthCallbackGitlabHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *OAuthCallbackGitlabHandler {
	return &OAuthCallbackGitlabHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *OAuthCallbackGitlabHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	session, err := p.Config().Store.Get(r, p.Config().ServerConf.CookieName)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if _, ok := session.Values["state"]; !ok {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if r.URL.Query().Get("state") != session.Values["state"] {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	userID, _ := session.Values["user_id"].(uint)
	projID, _ := session.Values["project_id"].(uint)
	integrationID := session.Values["integration_id"].(uint)

	giIntegration, err := p.Repo().GitlabIntegration().ReadGitlabIntegration(projID, integrationID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrForbidden(
				fmt.Errorf("gitlab integration with id %d not found in project %d",
					integrationID, projID),
			))
			return
		}

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	token, err := commonutils.GetGitlabOAuthConf(p.Config(), giIntegration).
		Exchange(context.Background(), r.URL.Query().Get("code"))

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	if !token.Valid() {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("invalid token")))
		return
	}

	oauthInt := &integrations.OAuthIntegration{
		SharedOAuthModel: integrations.SharedOAuthModel{
			AccessToken:  []byte(token.AccessToken),
			RefreshToken: []byte(token.RefreshToken),
			Expiry:       token.Expiry,
		},
		Client:    types.OAuthGitlab,
		UserID:    userID,
		ProjectID: projID,
	}

	oauthInt, err = p.Repo().OAuthIntegration().CreateOAuthIntegration(oauthInt)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if oauthInt.ID == 0 {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating oauth integration for gitlab")))
		return
	}

	giOAuthInt := &integrations.GitlabAppOAuthIntegration{
		OAuthIntegrationID:  oauthInt.ID,
		GitlabIntegrationID: integrationID,
	}

	// create the oauth integration first
	_, err = p.Repo().GitlabAppOAuthIntegration().CreateGitlabAppOAuthIntegration(giOAuthInt)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if redirectStr, ok := session.Values["redirect_uri"].(string); ok && redirectStr != "" {
		// attempt to parse the redirect uri, if it fails just redirect to dashboard
		redirectURI, err := url.Parse(redirectStr)

		if err != nil {
			http.Redirect(w, r, "/dashboard", http.StatusFound)
		}

		http.Redirect(w, r, fmt.Sprintf("%s?%s", redirectURI.Path, redirectURI.RawQuery), http.StatusFound)
	} else {
		http.Redirect(w, r, "/dashboard", http.StatusFound)
	}
}
