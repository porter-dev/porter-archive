package cluster

import (
	"fmt"
	"net/http"
	"strings"
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

	k8sAgent, err := c.GetAgent(r, cluster, "porter-agent-system")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if len(request.Labels) == 0 {
		return
	}

	// validate that the labels are valid
	for _, label := range request.Labels {
		if key, val, found := strings.Cut(label, "="); !found || key == "" || val == "" {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("invalid label: %s", label),
				http.StatusBadRequest))
			return
		}
	}

	// validate start time
	if _, err := time.Parse(time.RFC3339, request.StartTime); err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("invalid start time: %s", request.StartTime),
			http.StatusBadRequest))
		return
	}

	err = k8sAgent.StreamPorterAgentLokiLog(request.Labels, request.StartTime, request.Limit, safeRW)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
