package gitinstallation

import (
	"context"
	"net/http"
	"sync"

	"github.com/google/go-github/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/integrations/buildpacks"
)

func initBuilderInfo() map[string]*buildpacks.BuilderInfo {
	builders := make(map[string]*buildpacks.BuilderInfo)
	builders[buildpacks.PaketoBuilder] = &buildpacks.BuilderInfo{
		Name: "Paketo",
		Builders: []string{
			"paketobuildpacks/builder:full",
		},
	}
	builders[buildpacks.HerokuBuilder] = &buildpacks.BuilderInfo{
		Name: "Heroku",
		Builders: []string{
			"heroku/buildpacks:20",
			"heroku/buildpacks:18",
		},
	}
	return builders
}

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

	builderInfoMap := initBuilderInfo()
	var wg sync.WaitGroup
	wg.Add(len(buildpacks.Runtimes))
	for i := range buildpacks.Runtimes {
		go func(idx int) {
			buildpacks.Runtimes[idx].Detect(
				client, directoryContents, owner, name, request.Dir, repoContentOptions,
				builderInfoMap[buildpacks.PaketoBuilder], builderInfoMap[buildpacks.HerokuBuilder],
			)
			wg.Done()
		}(i)
	}
	wg.Wait()

	var builders []*buildpacks.BuilderInfo
	for _, v := range builderInfoMap {
		builders = append(builders, v)
	}
	c.WriteResult(w, r, builders)
}
