package stacks

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type DeletePorterAppByNameHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewDeletePorterAppByNameHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeletePorterAppByNameHandler {
	return &DeletePorterAppByNameHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *DeletePorterAppByNameHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	name, reqErr := requestutils.GetURLParamString(r, types.URLParamReleaseName)
	if reqErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(reqErr, http.StatusBadRequest))
		return
	}

	porterApp, appErr := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, name)
	if appErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(appErr))
		return
	}

	delApp, delErr := c.Repo().PorterApp().DeletePorterApp(porterApp)
	if delErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(delErr))
		return
	}

	c.WriteResult(w, r, delApp)
}
