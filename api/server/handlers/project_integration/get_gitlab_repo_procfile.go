package project_integration

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/xanzy/go-gitlab"
	"gorm.io/gorm"
)

var procfileRegex = regexp.MustCompile("^([A-Za-z0-9_]+):\\s*(.+)$")

type GetGitlabRepoProcfileHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewGetGitlabRepoProcfileHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetGitlabRepoProcfileHandler {
	return &GetGitlabRepoProcfileHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *GetGitlabRepoProcfileHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	request := &types.GetProcfileRequest{}

	ok := p.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	integrationID, reqErr := requestutils.GetURLParamUint(r, "integration_id")

	if reqErr != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(reqErr))
		return
	}

	owner, reqErr := requestutils.GetURLParamString(r, types.URLParamGitRepoOwner)

	if reqErr != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(reqErr))
		return
	}

	name, reqErr := requestutils.GetURLParamString(r, types.URLParamGitRepoName)

	if reqErr != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(reqErr))
		return
	}

	branch, reqErr := requestutils.GetURLParamString(r, types.URLParamGitBranch)

	if reqErr != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(reqErr))
		return
	}

	path, err := url.QueryUnescape(request.Path)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("malformed query param path")))
		return
	}

	gi, err := p.Repo().GitlabIntegration().ReadGitlabIntegration(project.ID, integrationID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("no gitlab integration with ID: %d", integrationID), http.StatusNotFound))
			return
		}

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	giAppOAuth, err := p.Repo().GitlabAppOAuthIntegration().ReadGitlabAppOAuthIntegration(user.ID, project.ID, integrationID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unauthorized gitlab user"), http.StatusUnauthorized))
			return
		}

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	oauthInt, err := p.Repo().OAuthIntegration().ReadOAuthIntegration(project.ID, giAppOAuth.OAuthIntegrationID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unauthorized gitlab user"), http.StatusUnauthorized))
			return
		}

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	accessToken, _, err := oauth.GetAccessToken(oauthInt.SharedOAuthModel, commonutils.GetGitlabOAuthConf(
		p.Config(), gi,
	), oauth.MakeUpdateGitlabAppOAuthIntegrationFunction(project.ID, giAppOAuth, p.Repo()))

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("invalid gitlab access token"),
			http.StatusUnauthorized))
		return
	}

	client, err := gitlab.NewOAuthClient(accessToken, gitlab.WithBaseURL(gi.InstanceURL))

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	file, resp, err := client.RepositoryFiles.GetRawFile(fmt.Sprintf("%s/%s", owner, name),
		strings.TrimPrefix(path, "./"), &gitlab.GetRawFileOptions{
			Ref: gitlab.String(branch),
		},
	)

	if resp.StatusCode == http.StatusUnauthorized {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unauthorized gitlab user"), http.StatusUnauthorized))
		return
	} else if resp.StatusCode == http.StatusNotFound {
		w.WriteHeader(http.StatusNotFound)
		p.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("no such procfile exists")))
		return
	}

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	parsedContents := make(types.GetProcfileResponse)

	// parse the procfile information
	for _, line := range strings.Split(string(file), "\n") {
		if matches := procfileRegex.FindStringSubmatch(line); matches != nil {
			parsedContents[matches[1]] = matches[2]
		}
	}

	p.WriteResult(w, r, parsedContents)
}
