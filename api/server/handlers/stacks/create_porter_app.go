package stacks

import (
	"fmt"
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
	fmt.Println("congrats on making it!", cluster.ID, project.ID)

	app := &models.PorterApp{
		Name:      "test",
		ClusterID: cluster.ID,
		ProjectID: project.ID,
		GitBranch: "main",

		BuildContext: "./",
		Builder:      "heroku/buildpacks:18",
		Buildpacks:   "nodejs",
		Dockerfile:   "",
	}

	_, err := c.Repo().PorterApp().CreatePorterApp(app)
	if err != nil {
		return
	}

	w.WriteHeader(http.StatusCreated)
}
