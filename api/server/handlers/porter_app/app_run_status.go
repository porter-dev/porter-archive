package porter_app

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared/requestutils"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	corev1 "k8s.io/api/core/v1"
)

// AppRunStatusHandler handles requests to the /apps/{porter_app_name}/run-status endpoint
type AppRunStatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewAppRunStatusHandler returns a new AppRunStatusHandler
func NewAppRunStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *AppRunStatusHandler {
	return &AppRunStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// AppRunStatusRequest is the request object for the /apps/{porter_app_name}/run-status endpoint
type AppRunStatusRequest struct {
	// DeploymentTargetID is the id of the deployment target the job was run against
	DeploymentTargetID string `json:"deployment_target_id"`

	// JobRunID is the UID returned from the /apps/{porter_app_name}/run endpoint
	JobRunID string `json:"job_id"`

	// ServiceName is the name of the app service that was triggered
	ServiceName string `json:"service_name"`

	// Namespace is the namespace in which the job was deployed
	Namespace string `json:"namespace"`
}

// AppRunStatusResponse is the response object for the /apps/{porter_app_name}/run-status endpoint
type AppRunStatusResponse struct {
	Status PodStatus `json:"job_run_id"`
}

// PodStatus is a status of a pod
// +enum
type PodStatus string

// These are the valid statuses of pods, ported from the Kubernetes api.
const (
	// PodPending means the pod has been accepted by the system, but one or more of the containers
	// has not been started. This includes time before being bound to a node, as well as time spent
	// pulling images onto the host.
	PodStatus_Pending PodStatus = "Pending"
	// PodRunning means the pod has been bound to a node and all of the containers have been started.
	// At least one container is still running or is in the process of being restarted.
	PodStatus_Running PodStatus = "Running"
	// PodSucceeded means that all containers in the pod have voluntarily terminated
	// with a container exit code of 0, and the system is not going to restart any of these containers.
	PodStatus_Succeeded PodStatus = "Succeeded"
	// PodFailed means that all containers in the pod have terminated, and at least one container has
	// terminated in a failure (exited with a non-zero exit code or was stopped by the system).
	PodStatus_Failed PodStatus = "Failed"
	// PodUnknown means that for some reason the state of the pod could not be obtained, typically due
	// to an error in communicating with the host of the pod.
	// Deprecated: It isn't being set since 2015 (74da3b14b0c0f658b3bb8d2def5094686d0e9095)
	PodStatus_Unknown PodStatus = "Unknown"
)

// ServeHTTP gets the status of a one-off command in the same environment as the provided service, app and deployment target
func (c *AppRunStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-app-run-status")
	defer span.End()

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing app name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	request := &AppRunStatusRequest{}
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

	status, err := c.getJobStatus(ctx, getJobStatusInput{
		AppName:            appName,
		Cluster:            cluster,
		DeploymentTargetID: request.DeploymentTargetID,
		HttpRequest:        r,
		JobRunID:           request.JobRunID,
		Namespace:          request.Namespace,
		ServiceName:        request.ServiceName,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting job status")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	response := AppRunStatusResponse{
		Status: status,
	}

	c.WriteResult(w, r, response)
}

type getJobStatusInput struct {
	// AppName is the name of the app associated with the job
	AppName string

	// Cluster is a cluster against which to retrieve a helm agent for
	Cluster *models.Cluster

	// DeploymentTargetID is the id of the deployment target the job was run against
	DeploymentTargetID string

	// HttpRequest is an HTTP Request object to retrieve a helm agent from
	HttpRequest *http.Request

	// JobRunID is the UID returned from the /apps/{porter_app_name}/run endpoint
	JobRunID string

	// Namespace is the namespace in which the job was deployed
	Namespace string

	// ServiceName is the name of the app service that was triggered
	ServiceName string
}

func (c *AppRunStatusHandler) getJobStatus(ctx context.Context, input getJobStatusInput) (PodStatus, error) {
	ctx, span := telemetry.NewSpan(ctx, "serve-app-run-status")
	defer span.End()

	if input.AppName != "" {
		return PodStatus_Unknown, telemetry.Error(ctx, span, nil, "missing app name in input")
	}
	if input.Cluster != nil {
		return PodStatus_Unknown, telemetry.Error(ctx, span, nil, "missing cluster in input")
	}
	if input.DeploymentTargetID != "" {
		return PodStatus_Unknown, telemetry.Error(ctx, span, nil, "missing deployment target id in input")
	}
	if input.HttpRequest != nil {
		return PodStatus_Unknown, telemetry.Error(ctx, span, nil, "missing http request in input")
	}
	if input.JobRunID != "" {
		return PodStatus_Unknown, telemetry.Error(ctx, span, nil, "missing job run id in input")
	}
	if input.Namespace != "" {
		return PodStatus_Unknown, telemetry.Error(ctx, span, nil, "missing namespace in input")
	}
	if input.ServiceName != "" {
		return PodStatus_Unknown, telemetry.Error(ctx, span, nil, "missing service name in input")
	}

	agent, err := c.GetAgent(input.HttpRequest, input.Cluster, "")
	if err != nil {
		return PodStatus_Unknown, telemetry.Error(ctx, span, err, "unable to get agent")
	}

	selectors := []string{
		fmt.Sprintf("batch.kubernetes.io/controller-uid=%s", input.JobRunID),
		fmt.Sprintf("porter.run/app-name=%s", input.AppName),
		fmt.Sprintf("porter.run/deployment-target-id=%s", input.DeploymentTargetID),
		fmt.Sprintf("porter.run/service-name=%s", input.ServiceName),
	}
	labelSelector := strings.Join(selectors, ",")

	podsList, err := agent.GetPodsByLabel(labelSelector, input.Namespace)
	if err != nil {
		return PodStatus_Unknown, telemetry.Error(ctx, span, err, "error getting jobs from cluster")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "pod-count", Value: len(podsList.Items)})

	if len(podsList.Items) == 0 {
		return PodStatus_Unknown, telemetry.Error(ctx, span, err, "no matching jobs found for specified job id")
	}

	if len(podsList.Items) != 1 {
		return PodStatus_Unknown, telemetry.Error(ctx, span, err, "too many pods found for specified job id")
	}

	var status PodStatus
	switch podsList.Items[0].Status.Phase {
	case corev1.PodPending:
		status = PodStatus_Pending
	case corev1.PodRunning:
		status = PodStatus_Running
	case corev1.PodSucceeded:
		status = PodStatus_Succeeded
	case corev1.PodFailed:
		status = PodStatus_Failed
	default:
		return PodStatus_Unknown, telemetry.Error(ctx, span, nil, "unknown status for job")
	}

	return status, nil
}
