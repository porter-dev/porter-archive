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

type CreateTagHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateTagHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateTagHandler {
	return &CreateTagHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateTagHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	newTag := &types.CreateTagRequest{}

	if ok := c.DecodeAndValidate(w, r, newTag); !ok {
		return
	}

	tag, err := c.Repo().Tag().CreateTag(&models.Tag{
		Name:      newTag.Name,
		Color:     newTag.Color,
		ProjectID: project.ID,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	}

	w.WriteHeader(http.StatusCreated)
	c.WriteResult(w, r, tag)
}
