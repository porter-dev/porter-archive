package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// RenameProjectHandler Renames a project
type RenameProjectHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewRenameProjectHandler renames the project with the given name
func NewRenameProjectHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RenameProjectHandler {
	return &RenameProjectHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *RenameProjectHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	request := &types.UpdateProjectNameRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.Name != "" && proj.Name != request.Name {
		proj.Name = request.Name
	}

	project, err := c.Repo().Project().UpdateProject(proj)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, project.ToProjectType(c.Config().LaunchDarklyClient))
}
