package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/websocket"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type GetIncidentEventLogsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetIncidentEventLogsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetIncidentEventLogsHandler {
	return &GetIncidentEventLogsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetIncidentEventLogsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	safeRW := r.Context().Value(types.RequestCtxWebsocketKey).(*websocket.WebsocketSafeReadWriter)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.GetIncidentEventLogsRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	k8sAgent, err := c.GetAgent(r, cluster, "monitoring")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	err = k8sAgent.StreamPorterAgentLokiLog(request.LogID, safeRW)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
