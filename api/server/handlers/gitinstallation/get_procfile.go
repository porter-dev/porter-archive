package gitinstallation

import (
	"context"
	"net/http"
	"regexp"
	"strings"

	"github.com/google/go-github/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
)

var procfileRegex = regexp.MustCompile("^([A-Za-z0-9_]+):\\s*(.+)$")

type GithubGetProcfileHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGithubGetProcfileHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GithubGetProcfileHandler {
	return &GithubGetProcfileHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GithubGetProcfileHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.GetProcfileRequest{}

	ok := c.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	owner, name, ok := GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	branch, reqErr := requestutils.GetURLParamString(r, types.URLParamGitBranch)

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)
		return
	}

	client, err := GetGithubAppClientFromRequest(c.Config(), r)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	resp, _, _, err := client.Repositories.GetContents(
		context.TODO(),
		owner,
		name,
		request.Path,
		&github.RepositoryContentGetOptions{
			Ref: branch,
		},
	)

	if err != nil {
		http.NotFound(w, r)
		return
	}

	fileData, err := resp.GetContent()

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	parsedContents := make(types.GetProcfileResponse)

	// parse the procfile information
	for _, line := range strings.Split(fileData, "\n") {
		if matches := procfileRegex.FindStringSubmatch(line); matches != nil {
			parsedContents[matches[1]] = matches[2]
		}
	}

	c.WriteResult(w, r, parsedContents)
}
