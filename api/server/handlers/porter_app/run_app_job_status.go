package porter_app

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared/requestutils"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// AppJobRunStatusHandler handles requests to the /apps/{porter_app_name}/run-status endpoint
type AppJobRunStatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewAppJobRunStatusHandler returns a new AppRunJobStatusHandler
func NewAppJobRunStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AppJobRunStatusHandler {
	return &AppJobRunStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// AppJobRunStatusRequest is the request object for the /apps/{porter_app_name}/run-status endpoint
type AppJobRunStatusRequest struct {
	// DeploymentTargetID is the id of the deployment target the job was run against
	DeploymentTargetID string `json:"deployment_target_id"`

	// DeploymentTargetName is the name of the deployment target the job was run against
	DeploymentTargetName string `json:"deployment_target_name"`

	// JobRunID is the UID returned from the /apps/{porter_app_name}/run endpoint
	JobRunID string `json:"job_id"`

	// ServiceName is the name of the app service that was triggered
	ServiceName string `json:"service_name"`
}

// AppJobRunStatusResponse is the response object for the /apps/{porter_app_name}/run-status endpoint
type AppJobRunStatusResponse struct {
	Status porter_app.InstanceStatusDescriptor `json:"status"`
}

// ServeHTTP gets the status of a one-off command in the same environment as the provided service, app and deployment target
func (c *AppJobRunStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-app-job-run-status")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing app name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	request := &AppJobRunStatusRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.JobRunID == "" {
		err := telemetry.Error(ctx, span, nil, "job id is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "job-run-id", Value: request.JobRunID})

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

	details, err := c.Config().ClusterControlPlaneClient.DeploymentTargetDetails(ctx, connect.NewRequest(&porterv1.DeploymentTargetDetailsRequest{
		ProjectId: int64(project.ID),
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id:   request.DeploymentTargetID,
			Name: deploymentTargetName,
		},
	}))
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting deployment target details")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if details == nil || details.Msg == nil || details.Msg.DeploymentTarget == nil {
		err := telemetry.Error(ctx, span, err, "deployment target details are nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	namespace := details.Msg.DeploymentTarget.Namespace

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to get kubernetes agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if agent == nil {
		err := telemetry.Error(ctx, span, nil, "no kubernetes agent returned")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	status, err := c.getJobStatus(ctx, getJobStatusInput{
		AppName:            appName,
		DeploymentTargetID: details.Msg.DeploymentTarget.Id,
		ClusterK8sAgent:    *agent,
		JobRunID:           request.JobRunID,
		Namespace:          namespace,
		ServiceName:        request.ServiceName,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting job status")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	response := AppJobRunStatusResponse{
		Status: status,
	}

	c.WriteResult(w, r, response)
}

type getJobStatusInput struct {
	// AppName is the name of the app associated with the job
	AppName string

	// DeploymentTargetID is the id of the deployment target the job was run against
	DeploymentTargetID string

	// ClusterK8sAgent is a kubernetes agent
	ClusterK8sAgent kubernetes.Agent

	// JobRunID is the UID returned from the /apps/{porter_app_name}/run endpoint
	JobRunID string

	// Namespace is the namespace in which the job was deployed
	Namespace string

	// ServiceName is the name of the app service that was triggered
	ServiceName string
}

func (c *AppJobRunStatusHandler) getJobStatus(ctx context.Context, input getJobStatusInput) (porter_app.InstanceStatusDescriptor, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-job-status")
	defer span.End()

	if input.AppName == "" {
		return porter_app.InstanceStatusDescriptor_Unknown, telemetry.Error(ctx, span, nil, "missing app name in input")
	}
	if input.DeploymentTargetID == "" {
		return porter_app.InstanceStatusDescriptor_Unknown, telemetry.Error(ctx, span, nil, "missing deployment target id in input")
	}
	if input.JobRunID == "" {
		return porter_app.InstanceStatusDescriptor_Unknown, telemetry.Error(ctx, span, nil, "missing job run id in input")
	}
	if input.Namespace == "" {
		return porter_app.InstanceStatusDescriptor_Unknown, telemetry.Error(ctx, span, nil, "missing namespace in input")
	}
	if input.ServiceName == "" {
		return porter_app.InstanceStatusDescriptor_Unknown, telemetry.Error(ctx, span, nil, "missing service name in input")
	}

	selectors := []string{
		fmt.Sprintf("batch.kubernetes.io/controller-uid=%s", input.JobRunID),
		fmt.Sprintf("porter.run/app-name=%s", input.AppName),
		fmt.Sprintf("porter.run/deployment-target-id=%s", input.DeploymentTargetID),
		fmt.Sprintf("porter.run/service-name=%s", input.ServiceName),
	}
	labelSelector := strings.Join(selectors, ",")

	podsList, err := input.ClusterK8sAgent.GetPodsByLabel(labelSelector, input.Namespace)
	if err != nil {
		return porter_app.InstanceStatusDescriptor_Unknown, telemetry.Error(ctx, span, err, "error getting jobs from cluster")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "pod-count", Value: len(podsList.Items)})

	if len(podsList.Items) == 0 {
		return porter_app.InstanceStatusDescriptor_Unknown, telemetry.Error(ctx, span, err, "no matching jobs found for specified job id")
	}

	if len(podsList.Items) != 1 {
		return porter_app.InstanceStatusDescriptor_Unknown, telemetry.Error(ctx, span, err, "too many pods found for specified job id")
	}

	status, err := porter_app.InstanceStatusFromPod(ctx, porter_app.InstanceStatusFromPodInput{
		Pod:         podsList.Items[0],
		AppName:     input.AppName,
		ServiceName: input.ServiceName,
	})
	if err != nil {
		return porter_app.InstanceStatusDescriptor_Unknown, telemetry.Error(ctx, span, err, "unable to fetch instance status from job pod")
	}

	if status.Status == porter_app.InstanceStatusDescriptor_Unknown {
		return porter_app.InstanceStatusDescriptor_Unknown, telemetry.Error(ctx, span, nil, "unknown status for job")
	}

	return status.Status, nil
}
