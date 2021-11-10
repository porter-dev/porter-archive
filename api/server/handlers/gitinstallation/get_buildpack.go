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
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/integrations/buildpacks"
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

	branch, ok := GetBranch(c, w, r)

	if !ok {
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

	res := &types.GetBuildpackResponse{}

	nodeRuntime := buildpacks.NewAPINodeRuntime(client)
	config := nodeRuntime.Detect(directoryContents, owner, name, request.Dir, repoContentOptions)
	if config != nil {
		res.Name = "Node.js"
		res.Runtime = config["runtime"].(string)
		res.Buildpacks = config["buildpacks"].([]*buildpacks.BuildpackInfo)
		if res.Runtime != "node-standalone" {
			res.Config = map[string]interface{}{"scripts": config["scripts"], "node_engine": config["node_engine"]}
		}
	}

	c.WriteResult(w, r, res)
}
