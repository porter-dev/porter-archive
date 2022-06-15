package project_integration

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/integrations/buildpacks"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/xanzy/go-gitlab"
)

type GetGitlabRepoBuildpackHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewGetGitlabRepoBuildpackHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetGitlabRepoBuildpackHandler {
	return &GetGitlabRepoBuildpackHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *GetGitlabRepoBuildpackHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	gi, _ := r.Context().Value(types.GitlabIntegrationScope).(*ints.GitlabIntegration)

	request := &types.GetBuildpackRequest{}

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

	client, err := getGitlabClient(p.Repo(), user.ID, project.ID, gi, p.Config())

	if err != nil {
		if errors.Is(err, errUnauthorizedGitlabUser) {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(errUnauthorizedGitlabUser, http.StatusUnauthorized))
		}

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	dir, err := url.QueryUnescape(request.Dir)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("malformed query param dir")))
		return
	}

	dir = strings.TrimPrefix(dir, "./")

	if len(dir) == 0 {
		dir = "."
	}

	tree, resp, err := client.Repositories.ListTree(fmt.Sprintf("%s/%s", owner, name), &gitlab.ListTreeOptions{
		Path: gitlab.String(dir),
		Ref:  gitlab.String(branch),
	})

	if resp.StatusCode == http.StatusUnauthorized {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unauthorized gitlab user"), http.StatusUnauthorized))
		return
	} else if resp.StatusCode == http.StatusNotFound {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("no such gitlab project found"), http.StatusNotFound))
		return
	}

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	builderInfoMap := initBuilderInfo()
	var wg sync.WaitGroup
	wg.Add(len(buildpacks.Runtimes))
	for i := range buildpacks.Runtimes {
		go func(idx int) {
			defer func() {
				if rec := recover(); rec != nil {
					p.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("panic detected in runtime detection")))
					return
				}
			}()
			buildpacks.Runtimes[idx].DetectGitlab(
				client, tree, owner, name, dir, branch,
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

	p.WriteResult(w, r, builders)
}

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
