package release

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type GetGHATemplateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewGetGHATemplateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetGHATemplateHandler {
	return &GetGHATemplateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GetGHATemplateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	namespace := r.Context().Value(types.NamespaceScope).(string)

	request := &types.GetGHATemplateRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	_, workflowYAML, err := createGitAction(
		c.Config(),
		user.ID,
		cluster.ProjectID,
		cluster.ID,
		request.GithubActionConfig,
		request.ReleaseName,
		namespace,
		nil,
	)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := types.GetGHATemplateResponse(workflowYAML)

	c.WriteResult(w, r, res)
}
