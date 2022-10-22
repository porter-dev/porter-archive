package namespace

import (
	"fmt"
	"net/http"
	"time"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/websocket"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type StreamPodLogsLokiHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewStreamPodLogsLokiHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *StreamPodLogsLokiHandler {
	return &StreamPodLogsLokiHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *StreamPodLogsLokiHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.GetLogRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	safeRW := r.Context().Value(types.RequestCtxWebsocketKey).(*websocket.WebsocketSafeReadWriter)

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if request.StartRange == nil {
		dayAgo := time.Now().Add(-24 * time.Hour)
		request.StartRange = &dayAgo
	}

	startTime, err := request.StartRange.MarshalText()

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	err = agent.StreamPorterAgentLokiLog([]string{
		fmt.Sprintf("pod=%s", request.PodSelector),
		fmt.Sprintf("namespace=%s", request.Namespace),
	}, string(startTime), request.SearchParam, 0, safeRW)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
