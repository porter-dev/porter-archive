package porter_app

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/deployment_target"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/server/shared/websocket"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// StreamLogsLokiHandler handles the /apps/logs/loki endpoint
type StreamLogsLokiHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewStreamLogsLokiHandler returns a new StreamLogsLokiHandler
func NewStreamLogsLokiHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *StreamLogsLokiHandler {
	return &StreamLogsLokiHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServeHTTP streams live logs for a given app, service, and deployment target
func (c *StreamLogsLokiHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-stream-app-logs")
	defer span.End()
	r = r.Clone(ctx)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &AppLogsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "invalid request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "porter app name not found in request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	if request.ServiceName == "" {
		err := telemetry.Error(ctx, span, nil, "must provide service name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "service-name", Value: request.ServiceName})

	deploymentTargetName := request.DeploymentTargetName
	if request.DeploymentTargetName == "" && request.DeploymentTargetID == "" {
		defaultDeploymentTarget, err := defaultDeploymentTarget(ctx, defaultDeploymentTargetInput{
			ProjectID:                 project.ID,
			ClusterID:                 cluster.ID,
			ClusterControlPlaneClient: c.Config().ClusterControlPlaneClient,
		})
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting default deployment target")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		deploymentTargetName = defaultDeploymentTarget.Name
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "deployment-target-name", Value: deploymentTargetName},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID},
	)

	deploymentTarget, err := deployment_target.DeploymentTargetDetails(ctx, deployment_target.DeploymentTargetDetailsInput{
		ProjectID:            int64(project.ID),
		ClusterID:            int64(cluster.ID),
		DeploymentTargetID:   request.DeploymentTargetID,
		DeploymentTargetName: deploymentTargetName,
		CCPClient:            c.Config().ClusterControlPlaneClient,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting deployment target details")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	namespace := deploymentTarget.Namespace
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "namespace", Value: namespace})

	if request.StartRange.IsZero() {
		dayAgo := time.Now().Add(-24 * time.Hour)
		request.StartRange = dayAgo
	}

	startTime, err := request.StartRange.MarshalText()
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error marshaling start time")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "start-time", Value: string(startTime)})

	safeRW := r.Context().Value(types.RequestCtxWebsocketKey).(*websocket.WebsocketSafeReadWriter)

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	labels := []string{
		fmt.Sprintf("%s=%s", lokiLabel_Namespace, namespace),
		fmt.Sprintf("%s=%s", lokiLabel_PorterAppName, appName),
		fmt.Sprintf("%s=%s", lokiLabel_DeploymentTargetId, request.DeploymentTargetID),
		fmt.Sprintf("%s=%s", lokiLabel_PorterAppID, fmt.Sprintf("%d", request.AppID)),
	}

	if request.ServiceName != "all" {
		labels = append(labels, fmt.Sprintf("%s=%s", lokiLabel_PorterServiceName, request.ServiceName))
	}
	if request.AppRevisionID != "" {
		labels = append(labels, fmt.Sprintf("%s=%s", lokiLabel_PorterAppRevisionID, request.AppRevisionID))
	}
	if request.JobRunName != "" {
		labels = append(labels, fmt.Sprintf("%s=%s", lokiLabel_JobRunName, request.JobRunName))
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "labels", Value: strings.Join(labels, ",")})

	err = agent.StreamPorterAgentLokiLog(ctx, labels, string(startTime), request.SearchParam, 0, safeRW)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error streaming logs")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
}
