package porter_app

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared/requestutils"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// AppRunHandler handles requests to the /apps/{porter_app_name}/run endpoint
type AppRunHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewAppRunHandler returns a new AppRunHandler
func NewAppRunHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AppRunHandler {
	return &AppRunHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// AppRunRequest is the request object for the /apps/{porter_app_name}/run endpoint
type AppRunRequest struct {
	ServiceName        string `json:"service_name"`
	DeploymentTargetID string `json:"deployment_target_id"`
}

// AppRunResponse is the response object for the /apps/{porter_app_name}/run endpoint
type AppRunResponse struct {
	JobRunID string `json:"job_run_id"`
}

// ServeHTTP runs a one-off command in the same environment as the provided service, app and deployment target
func (c *AppRunHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-app-run")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing app name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	request := &AppRunRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.ServiceName == "" {
		err := telemetry.Error(ctx, span, nil, "service name is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "service-name", Value: request.ServiceName})

	if request.DeploymentTargetID == "" {
		err := telemetry.Error(ctx, span, nil, "deployment target id is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID})

	manualServiceRunReq := connect.NewRequest(&porterv1.ManualServiceRunRequest{
		ProjectId:   int64(project.ID),
		AppName:     appName,
		ServiceName: request.ServiceName,
		Command:     nil, // use default command for job
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id: request.DeploymentTargetID,
		},
	})

	serviceResp, err := c.Config().ClusterControlPlaneClient.ManualServiceRun(ctx, manualServiceRunReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting app helm values from cluster control plane client")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if serviceResp == nil || serviceResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "app helm values resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := AppRunResponse{
		JobRunID: serviceResp.Msg.JobRunId,
	}

	c.WriteResult(w, r, response)
}
