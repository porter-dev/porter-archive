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

// RunAppJobHandler handles requests to the /apps/{porter_app_name}/run endpoint
type RunAppJobHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewRunAppJobHandler returns a new AppJobRunHandler
func NewRunAppJobHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RunAppJobHandler {
	return &RunAppJobHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// RunAppJobRequest is the request object for the /apps/{porter_app_name}/run endpoint
type RunAppJobRequest struct {
	ServiceName string `json:"service_name"`
	// DeploymentTargetID is the id of the deployment target the job should be run against. One of DeploymentTargetID or DeploymentTargetName is required
	DeploymentTargetID string `json:"deployment_target_id"`
	// DeploymentTargetName is the name of the deployment target the job should be run against. One of DeploymentTargetID or DeploymentTargetName is required
	DeploymentTargetName string `json:"deployment_target_name"`
	// Optional field to override the default run command for the job
	RunCommand string `json:"run_command"`
	// Image is an optional field to override the image used for the job
	Image Image `json:"image,omitempty"`
}

// RunAppJobResponse is the response object for the /apps/{porter_app_name}/run endpoint
type RunAppJobResponse struct {
	JobRunID string `json:"job_run_id"`
}

// ServeHTTP runs a one-off command in the same environment as the provided service, app and deployment target
func (c *RunAppJobHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-app-job-run")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing app name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	request := &RunAppJobRequest{}
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

	deploymentTargetName := request.DeploymentTargetName
	if request.DeploymentTargetName == "" && request.DeploymentTargetID == "" {
		defaultDeploymentTarget, err := DefaultDeploymentTarget(ctx, DefaultDeploymentTargetInput{
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

	var commandOptional *string
	if request.RunCommand != "" {
		commandOptional = &request.RunCommand
	}

	var imageOverrideOptional *porterv1.AppImage
	if request.Image.Tag != "" {
		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "image-override-repo", Value: request.Image.Repository},
			telemetry.AttributeKV{Key: "image-override-tag", Value: request.Image.Tag},
		)
		imageOverrideOptional = &porterv1.AppImage{
			Repository: request.Image.Repository,
			Tag:        request.Image.Tag,
		}
	}

	manualServiceRunReq := connect.NewRequest(&porterv1.ManualServiceRunRequest{
		ProjectId:   int64(project.ID),
		AppName:     appName,
		ServiceName: request.ServiceName,
		Command:     commandOptional,
		Image:       imageOverrideOptional,
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id:   request.DeploymentTargetID,
			Name: deploymentTargetName,
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

	response := RunAppJobResponse{
		JobRunID: serviceResp.Msg.JobRunId,
	}

	c.WriteResult(w, r, response)
}
