package porter_app

import (
	"fmt"
	"net/http"
	"time"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/deployment_target"
	porter_agent "github.com/porter-dev/porter/internal/kubernetes/porter_agent/v2"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"
)

// AppLogsHandler handles the /apps/logs endpoint
type AppLogsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewAppLogsHandler returns a new AppLogsHandler
func NewAppLogsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AppLogsHandler {
	return &AppLogsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// AppLogsRequest represents the accepted fields on a request to the /apps/logs endpoint
type AppLogsRequest struct {
	DeploymentTargetID   string    `schema:"deployment_target_id"`
	DeploymentTargetName string    `schema:"deployment_target_name"`
	ServiceName          string    `schema:"service_name"`
	AppID                uint      `schema:"app_id"`
	Limit                uint      `schema:"limit"`
	StartRange           time.Time `schema:"start_range,omitempty"`
	EndRange             time.Time `schema:"end_range,omitempty"`
	SearchParam          string    `schema:"search_param"`
	Direction            string    `schema:"direction"`
	AppRevisionID        string    `schema:"app_revision_id"`
	JobRunName           string    `schema:"job_run_name"`
}

const (
	lokiLabel_PorterAppName       = "porter_run_app_name"
	lokiLabel_PorterAppID         = "porter_run_app_id"
	lokiLabel_PorterServiceName   = "porter_run_service_name"
	lokiLabel_PorterAppRevisionID = "porter_run_app_revision_id"
	lokiLabel_DeploymentTargetId  = "porter_run_deployment_target_id"
	lokiLabel_JobRunName          = "job_name"
	lokiLabel_Namespace           = "namespace"
)

const defaultLogLineLimit = 1000

// AppLogsResponse represents the response to the /apps/logs endpoint
type AppLogsResponse struct {
	BackwardContinueTime *time.Time                 `json:"backward_continue_time,omitempty"`
	ForwardContinueTime  *time.Time                 `json:"forward_continue_time,omitempty"`
	Logs                 []porter_app.StructuredLog `json:"logs"`
}

// ServeHTTP gets logs for a given app, service, and deployment target
func (c *AppLogsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-app-logs")
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

	startRange := request.StartRange
	if request.StartRange.IsZero() {
		dayAgo := time.Now().Add(-24 * time.Hour).UTC()
		startRange = dayAgo
	}

	endRange := request.EndRange
	if request.EndRange.IsZero() {
		endRange = time.Now().UTC()
	}

	limit := request.Limit
	if request.Limit == 0 {
		limit = defaultLogLineLimit
	}

	direction := request.Direction
	if request.Direction == "" {
		direction = "backward"
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "start-range", Value: request.StartRange.String()},
		telemetry.AttributeKV{Key: "end-range", Value: request.EndRange.String()},
		telemetry.AttributeKV{Key: "limit", Value: limit},
		telemetry.AttributeKV{Key: "direction", Value: direction},
	)

	k8sAgent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "unable to get agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unable to get agent"), http.StatusInternalServerError))
		return
	}

	agentSvc, err := porter_agent.GetAgentService(k8sAgent.Clientset)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "unable to get agent service")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unable to get agent service"), http.StatusInternalServerError))
		return
	}

	matchLabels := map[string]string{
		lokiLabel_Namespace:          namespace,
		lokiLabel_PorterAppName:      appName,
		lokiLabel_DeploymentTargetId: request.DeploymentTargetID,
	}

	if request.ServiceName != "all" {
		matchLabels[lokiLabel_PorterServiceName] = request.ServiceName
	}
	if request.AppRevisionID != "" {
		matchLabels[lokiLabel_PorterAppRevisionID] = request.AppRevisionID
	}
	if request.JobRunName != "" {
		matchLabels[lokiLabel_JobRunName] = request.JobRunName
	}

	logRequest := &types.LogRequest{
		Limit:       limit,
		StartRange:  &startRange,
		EndRange:    &endRange,
		MatchLabels: matchLabels,
		Direction:   direction,
		SearchParam: request.SearchParam,
	}

	logs, err := porter_agent.Logs(ctx, k8sAgent.Clientset, agentSvc, logRequest)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "unable to get logs")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unable to get logs"), http.StatusInternalServerError))
		return
	}
	if logs == nil {
		err := telemetry.Error(ctx, span, nil, "logs response is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := AppLogsResponse{
		Logs:                 porter_app.AgentLogToStructuredLog(logs.Logs),
		ForwardContinueTime:  logs.ForwardContinueTime,
		BackwardContinueTime: logs.BackwardContinueTime,
	}

	c.WriteResult(w, r, res)
}
