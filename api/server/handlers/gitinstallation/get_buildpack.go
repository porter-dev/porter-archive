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

	var wg sync.WaitGroup
	wg.Add(len(buildpacks.Runtimes))
	detectResults := make(chan *buildpacks.RuntimeResponse, len(buildpacks.Runtimes))
	for i := range buildpacks.Runtimes {
		go func(idx int) {
			detectResults <- buildpacks.Runtimes[idx].Detect(
				client, directoryContents, owner, name, request.Dir, repoContentOptions,
			)
			wg.Done()
		}(i)
	}
	wg.Wait()
	close(detectResults)

	var matches []*buildpacks.RuntimeResponse
	for detectRes := range detectResults {
		if detectRes != nil {
			matches = append(matches, detectRes)
		}
	}

	c.WriteResult(w, r, matches)
}
