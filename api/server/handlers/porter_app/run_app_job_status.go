package porter_app

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared/requestutils"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	corev1 "k8s.io/api/core/v1"
)

// RunAppJobStatusHandler handles requests to the /apps/{porter_app_name}/run-status endpoint
type RunAppJobStatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewRunAppJobStatusHandler returns a new AppRunJobStatusHandler
func NewRunAppJobStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RunAppJobStatusHandler {
	return &RunAppJobStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// RunAppJobStatusRequest is the request object for the /apps/{porter_app_name}/run-status endpoint
type RunAppJobStatusRequest struct {
	// DeploymentTargetID is the id of the deployment target the job was run against
	DeploymentTargetID string `json:"deployment_target_id"`

	// JobRunID is the UID returned from the /apps/{porter_app_name}/run endpoint
	JobRunID string `json:"job_id"`

	// ServiceName is the name of the app service that was triggered
	ServiceName string `json:"service_name"`

	// Namespace is the namespace in which the job was deployed
	Namespace string `json:"namespace"`
}

// RunAppJobStatusResponse is the response object for the /apps/{porter_app_name}/run-status endpoint
type RunAppJobStatusResponse struct {
	Status RunAppJobStatus `json:"job_run_id"`
}

// RunAppJobStatus is a status of a pod
// +enum
type RunAppJobStatus string

// These are the valid statuses of pods, ported from the Kubernetes api.
const (
	// RunAppJobStatus_Pending means the pod has been accepted by the system, but one or more of the containers
	// has not been started. This includes time before being bound to a node, as well as time spent
	// pulling images onto the host.
	RunAppJobStatus_Pending RunAppJobStatus = "Pending"
	// RunAppJobStatus_Running means the pod has been bound to a node and all of the containers have been started.
	// At least one container is still running or is in the process of being restarted.
	RunAppJobStatus_Running RunAppJobStatus = "Running"
	// RunAppJobStatus_Succeeded means that all containers in the pod have voluntarily terminated
	// with a container exit code of 0, and the system is not going to restart any of these containers.
	RunAppJobStatus_Succeeded RunAppJobStatus = "Succeeded"
	// RunAppJobStatus_Failed means that all containers in the pod have terminated, and at least one container has
	// terminated in a failure (exited with a non-zero exit code or was stopped by the system).
	RunAppJobStatus_Failed RunAppJobStatus = "Failed"
	// RunAppJobStatus_Unknown means that for some reason the state of the pod could not be obtained, typically due
	// to an error in communicating with the host of the pod.
	// Deprecated: It isn't being set since 2015 (74da3b14b0c0f658b3bb8d2def5094686d0e9095)
	RunAppJobStatus_Unknown RunAppJobStatus = "Unknown"
)

// ServeHTTP gets the status of a one-off command in the same environment as the provided service, app and deployment target
func (c *RunAppJobStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-app-job-run-status")
	defer span.End()

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing app name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	request := &RunAppJobStatusRequest{}
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

	if request.Namespace == "" {
		err := telemetry.Error(ctx, span, nil, "namespace is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "namespace", Value: request.Namespace})

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
		DeploymentTargetID: request.DeploymentTargetID,
		ClusterK8sAgent:    *agent,
		JobRunID:           request.JobRunID,
		Namespace:          request.Namespace,
		ServiceName:        request.ServiceName,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting job status")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	response := RunAppJobStatusResponse{
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

func (c *RunAppJobStatusHandler) getJobStatus(ctx context.Context, input getJobStatusInput) (RunAppJobStatus, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-job-status")
	defer span.End()

	if input.AppName == "" {
		return RunAppJobStatus_Unknown, telemetry.Error(ctx, span, nil, "missing app name in input")
	}
	if input.DeploymentTargetID == "" {
		return RunAppJobStatus_Unknown, telemetry.Error(ctx, span, nil, "missing deployment target id in input")
	}
	if input.JobRunID == "" {
		return RunAppJobStatus_Unknown, telemetry.Error(ctx, span, nil, "missing job run id in input")
	}
	if input.Namespace == "" {
		return RunAppJobStatus_Unknown, telemetry.Error(ctx, span, nil, "missing namespace in input")
	}
	if input.ServiceName == "" {
		return RunAppJobStatus_Unknown, telemetry.Error(ctx, span, nil, "missing service name in input")
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
		return RunAppJobStatus_Unknown, telemetry.Error(ctx, span, err, "error getting jobs from cluster")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "pod-count", Value: len(podsList.Items)})

	if len(podsList.Items) == 0 {
		return RunAppJobStatus_Unknown, telemetry.Error(ctx, span, err, "no matching jobs found for specified job id")
	}

	if len(podsList.Items) != 1 {
		return RunAppJobStatus_Unknown, telemetry.Error(ctx, span, err, "too many pods found for specified job id")
	}

	var status RunAppJobStatus
	switch podsList.Items[0].Status.Phase {
	case corev1.PodPending:
		status = RunAppJobStatus_Pending
	case corev1.PodRunning:
		status = RunAppJobStatus_Running
	case corev1.PodSucceeded:
		status = RunAppJobStatus_Succeeded
	case corev1.PodFailed:
		status = RunAppJobStatus_Failed
	default:
		return RunAppJobStatus_Unknown, telemetry.Error(ctx, span, nil, "unknown status for job")
	}

	return status, nil
}
