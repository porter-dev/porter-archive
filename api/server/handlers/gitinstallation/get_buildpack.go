package gitinstallation

import (
	"context"
	"fmt"
	"net/http"
	"sync"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
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

	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	branch, ok := commonutils.GetBranchParam(c, w, r)

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
			defer func() {
				if rec := recover(); rec != nil {
					c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("panic detected in runtime detection")))
					return
				}
			}()
			buildpacks.Runtimes[idx].DetectGithub(
				client, directoryContents, owner, name, request.Dir, repoContentOptions,
				builderInfoMap[buildpacks.PaketoBuilder], builderInfoMap[buildpacks.HerokuBuilder],
			)
			wg.Done()
		}(i)
	}
	wg.Wait()

	// FIXME: add Java buildpacks
	builderInfoMap[buildpacks.PaketoBuilder].Others = append(builderInfoMap[buildpacks.PaketoBuilder].Others,
		buildpacks.BuildpackInfo{
			Name:      "Java",
			Buildpack: "gcr.io/paketo-buildpacks/java",
		})
	builderInfoMap[buildpacks.HerokuBuilder].Others = append(builderInfoMap[buildpacks.HerokuBuilder].Others,
		buildpacks.BuildpackInfo{
			Name:      "Java",
			Buildpack: "heroku/java",
		})

	var builders []*buildpacks.BuilderInfo
	for _, v := range builderInfoMap {
		builders = append(builders, v)
	}
	c.WriteResult(w, r, builders)
}
