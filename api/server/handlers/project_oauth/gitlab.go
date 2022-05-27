package project_oauth

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

type ProjectOAuthGitlabHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProjectOAuthGitlabHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProjectOAuthGitlabHandler {
	return &ProjectOAuthGitlabHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *ProjectOAuthGitlabHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	integrationIDStr := r.URL.Query().Get("integration_id")

	if len(integrationIDStr) == 0 {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("required query param integration_id")))
		return
	}

	integrationID, err := strconv.ParseUint(integrationIDStr, 10, 32)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	giIntegration, err := p.Repo().GitlabIntegration().ReadGitlabIntegration(proj.ID, uint(integrationID))

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			p.HandleAPIError(w, r, apierrors.NewErrForbidden(
				fmt.Errorf("gitlab integration with id %d not found in project %d", integrationID, proj.ID),
			))
		} else {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		}

		return
	}

	state := oauth.CreateRandomState()

	if err := p.PopulateOAuthSession(w, r, state, true, true, types.OAuthGitlab, uint(integrationID)); err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	gitlabConf := commonutils.GetGitlabOAuthConf(p.Config(), giIntegration)

	// specify access type offline to get a refresh token
	url := gitlabConf.AuthCodeURL(state, oauth2.AccessTypeOffline)

	http.Redirect(w, r, url, http.StatusFound)
}
