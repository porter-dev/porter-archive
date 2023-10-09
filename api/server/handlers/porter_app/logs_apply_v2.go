package porter_app

import (
	"fmt"
	"net/http"
	"time"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	porter_agent "github.com/porter-dev/porter/internal/kubernetes/porter_agent/v2"
	"github.com/porter-dev/porter/internal/models"
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
	DeploymentTargetID string    `schema:"deployment_target_id"`
	ServiceName        string    `schema:"service_name"`
	AppID              uint      `schema:"app_id"`
	Limit              uint      `schema:"limit"`
	StartRange         time.Time `schema:"start_range,omitempty"`
	EndRange           time.Time `schema:"end_range,omitempty"`
	SearchParam        string    `schema:"search_param"`
	Direction          string    `schema:"direction"`
	AppRevisionID      string    `schema:"app_revision_id"`
}

const (
	lokiLabel_PorterAppName       = "porter_run_app_name"
	lokiLabel_PorterAppID         = "porter_run_app_id"
	lokiLabel_PorterServiceName   = "porter_run_service_name"
	lokiLabel_PorterAppRevisionID = "porter_run_app_revision_id"
	lokiLabel_DeploymentTargetId  = "porter_run_deployment_target_id"
	lokiLabel_Namespace           = "namespace"
)

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

	if request.AppID == 0 {
		err := telemetry.Error(ctx, span, nil, "must provide app id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.ServiceName == "" {
		err := telemetry.Error(ctx, span, nil, "must provide service name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "service-name", Value: request.ServiceName})

	if request.DeploymentTargetID == "" {
		err := telemetry.Error(ctx, span, nil, "must provide deployment target id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID})

	deploymentTargetDetailsReq := connect.NewRequest(&porterv1.DeploymentTargetDetailsRequest{
		ProjectId:          int64(project.ID),
		DeploymentTargetId: request.DeploymentTargetID,
	})

	deploymentTargetDetailsResp, err := c.Config().ClusterControlPlaneClient.DeploymentTargetDetails(ctx, deploymentTargetDetailsReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting deployment target details from cluster control plane client")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if deploymentTargetDetailsResp == nil || deploymentTargetDetailsResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "deployment target details resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if deploymentTargetDetailsResp.Msg.ClusterId != int64(cluster.ID) {
		err := telemetry.Error(ctx, span, err, "deployment target details resp cluster id does not match cluster id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	namespace := deploymentTargetDetailsResp.Msg.Namespace
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "namespace", Value: namespace})

	if request.StartRange.IsZero() || request.EndRange.IsZero() {
		err := telemetry.Error(ctx, span, nil, "must provide start and end range")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "start-range", Value: request.StartRange.String()},
		telemetry.AttributeKV{Key: "end-range", Value: request.EndRange.String()},
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
		lokiLabel_Namespace:     namespace,
		lokiLabel_PorterAppName: appName,
		lokiLabel_PorterAppID:   fmt.Sprintf("%d", request.AppID),
	}

	if request.ServiceName != "all" {
		matchLabels[lokiLabel_PorterServiceName] = request.ServiceName
	}

	if request.AppRevisionID != "" {
		matchLabels[lokiLabel_PorterAppRevisionID] = request.AppRevisionID
	}

	matchLabels[lokiLabel_DeploymentTargetId] = request.DeploymentTargetID

	logRequest := &types.LogRequest{
		Limit:       request.Limit,
		StartRange:  &request.StartRange,
		EndRange:    &request.EndRange,
		MatchLabels: matchLabels,
		Direction:   request.Direction,
		SearchParam: request.SearchParam,
	}

	logs, err := porter_agent.Logs(k8sAgent.Clientset, agentSvc, logRequest)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "unable to get logs")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unable to get logs"), http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, logs)
}
