package gitinstallation

import (
	"context"
	"net/http"

	"github.com/google/go-github/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
)

type GithubGetBuildpackHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGithubGetBuildpackHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GithubGetBuildpackHandler {
	return &GithubGetBuildpackHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GithubGetBuildpackHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.GetBuildpackRequest{}

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

	repoContentOptions := github.RepositoryContentGetOptions{}
	repoContentOptions.Ref = branch
	_, directoryContents, _, err := client.Repositories.GetContents(
		context.Background(),
		owner,
		name,
		request.Dir,
		&repoContentOptions,
	)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var BREQS = map[string]string{
		"requirements.txt": "Python",
		"Gemfile":          "Ruby",
		"package.json":     "Node.js",
		"pom.xml":          "Java",
		"composer.json":    "PHP",
	}

	res := &types.GetBuildpackResponse{
		Valid: true,
	}

	matches := 0

	for i := range directoryContents {
		name := *directoryContents[i].Name

		bname, ok := BREQS[name]
		if ok {
			matches++
			res.Name = bname
		}
	}

	if matches != 1 {
		res.Valid = false
		res.Name = ""
	}

	c.WriteResult(w, r, res)
}
