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
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/xanzy/go-gitlab"
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
	gi, _ := r.Context().Value(types.GitlabIntegrationScope).(*ints.GitlabIntegration)

	request := &types.GetProcfileRequest{}

	ok := p.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	owner, name, ok := commonutils.GetOwnerAndNameParams(p, w, r)

	if !ok {
		return
	}

	branch, ok := commonutils.GetBranchParam(p, w, r)

	if !ok {
		return
	}

	path, err := url.QueryUnescape(request.Path)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("malformed query param path")))
		return
	}

	client, err := getGitlabClient(p.Repo(), user.ID, project.ID, gi, p.Config())

	if err != nil {
		if errors.Is(err, errUnauthorizedGitlabUser) {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(errUnauthorizedGitlabUser, http.StatusUnauthorized))
		}

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
