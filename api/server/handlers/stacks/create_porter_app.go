package stacks

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type CreatePorterAppHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreatePorterAppHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreatePorterAppHandler {
	return &CreatePorterAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *CreatePorterAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &types.CreatePorterAppRequest{}

	ok := c.DecodeAndValidate(w, r, request)
	if !ok {
		return
	}

	app := &models.PorterApp{
		Name:      request.Name,
		ClusterID: cluster.ID,
		ProjectID: project.ID,
		RepoName:  request.RepoName,
		GitRepoID: request.GitRepoID,
		GitBranch: request.GitBranch,

		BuildContext: request.BuildContext,
		Builder:      request.Builder,
		Buildpacks:   request.Buildpacks,
		Dockerfile:   request.Dockerfile,
		ImageRepoURI: request.ImageRepoURI,
	}

	porterApp, err := c.Repo().PorterApp().UpdatePorterApp(app)
	if err != nil {
		return
	}

	c.WriteResult(w, r, porterApp.ToPorterAppType())
}
