package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	porter_agent "github.com/porter-dev/porter/internal/kubernetes/porter_agent/v2"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type GetLogsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetLogsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetLogsHandler {
	return &GetLogsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetLogsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-logs")
	defer span.End()

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.GetLogRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
		telemetry.AttributeKV{Key: "limit", Value: request.Limit},
		telemetry.AttributeKV{Key: "start-range", Value: request.StartRange},
		telemetry.AttributeKV{Key: "end-range", Value: request.EndRange},
		telemetry.AttributeKV{Key: "search-param", Value: request.SearchParam},
		telemetry.AttributeKV{Key: "revision", Value: request.Revision},
		telemetry.AttributeKV{Key: "pod-selector", Value: request.PodSelector},
		telemetry.AttributeKV{Key: "namespace", Value: request.Namespace},
		telemetry.AttributeKV{Key: "direction", Value: request.Direction},
	)

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// get agent service
	agentSvc, err := porter_agent.GetAgentService(agent.Clientset)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to get agent service")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	logs, err := porter_agent.GetHistoricalLogs(ctx, agent.Clientset, agentSvc, request)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to get historical logs")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, logs)
}
