package notifications

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/porter_app/notifications/porter_error"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
	v1 "k8s.io/api/apps/v1"
)

// Deployment represents metadata about a k8s deployment
type Deployment struct {
	Status DeploymentStatus `json:"status"`
}

// DeploymentStatus represents the status of a k8s deployment
type DeploymentStatus string

const (
	// DeploymentStatus_Unknown indicates that the status of the deployment is unknown because we have not queried for it yet
	DeploymentStatus_Unknown DeploymentStatus = "UNKNOWN"
	// DeploymentStatus_Pending indicates that the deployment is still in progress
	DeploymentStatus_Pending DeploymentStatus = "PENDING"
	// DeploymentStatus_Success indicates that the deployment was successful
	DeploymentStatus_Success DeploymentStatus = "SUCCESS"
	// DeploymentStatus_Failure indicates that the deployment failed
	DeploymentStatus_Failure DeploymentStatus = "FAILURE"
)

// hydrateNotificationWithDeploymentInput is the input struct for hydrateNotificationWithDeployment
type hydrateNotificationWithDeploymentInput struct {
	// Notification is the notification to hydrate
	Notification
	// DeploymentTargetId is the ID of the deployment target
	DeploymentTargetId string
	// Namespace is the namespace of the deployment target
	Namespace string
	// K8sAgent is the k8s agent, used to query for deployment info
	K8sAgent kubernetes.Agent
	// EventRepo is the repository for app events, used to check if we've already marked this deployment as successful/failed
	EventRepo repository.PorterAppEventRepository
}

// hydrateNotificationWithDeployment hydrates a notification with k8s deployment info
func hydrateNotificationWithDeployment(ctx context.Context, inp hydrateNotificationWithDeploymentInput) (Notification, error) {
	ctx, span := telemetry.NewSpan(ctx, "hydrate-notification-with-deployment")
	defer span.End()

	hydratedNotification := inp.Notification

	if inp.Notification.Deployment.Status != DeploymentStatus_Unknown {
		return hydratedNotification, nil
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "deployment-target-id", Value: inp.DeploymentTargetId},
		telemetry.AttributeKV{Key: "namespace", Value: inp.Namespace},
		telemetry.AttributeKV{Key: "app-name", Value: inp.AppName},
		telemetry.AttributeKV{Key: "app-revision-id", Value: inp.Notification.AppRevisionID},
		telemetry.AttributeKV{Key: "service-name", Value: inp.ServiceName},
	)

	// first, we check if we've already marked this deployment as successful or failed
	status, err := porterAppDeployEventStatus(ctx, porterAppDeployEventStatusInput{
		AppID:         inp.AppID,
		EventRepo:     inp.EventRepo,
		AppRevisionID: inp.Notification.AppRevisionID,
		ServiceName:   inp.Notification.ServiceName,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "failed to get deployment status from db")
		return hydratedNotification, err
	}

	// the status is still pending in the db, so we haven't updated the user on it yet
	// therefore, we check the k8s deployment status
	if status == DeploymentStatus_Pending {
		selectors := []string{
			fmt.Sprintf("porter.run/deployment-target-id=%s", inp.DeploymentTargetId),
			fmt.Sprintf("porter.run/app-name=%s", inp.AppName),
			fmt.Sprintf("porter.run/app-revision-id=%s", inp.Notification.AppRevisionID),
			fmt.Sprintf("porter.run/service-name=%s", inp.ServiceName),
		}
		depls, err := inp.K8sAgent.GetDeploymentsBySelector(ctx, inp.Namespace, strings.Join(selectors, ","))
		if err != nil {
			err := telemetry.Error(ctx, span, err, "failed to get deployments for notification")
			return hydratedNotification, err
		}
		if len(depls.Items) == 0 {
			err := telemetry.Error(ctx, span, nil, "no deployments found for notification")
			return hydratedNotification, err
		}
		if len(depls.Items) > 1 {
			err := telemetry.Error(ctx, span, nil, "multiple deployments found for notification")
			return hydratedNotification, err
		}

		matchingDeployment := depls.Items[0]
		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "deployment-name", Value: matchingDeployment.Name},
			telemetry.AttributeKV{Key: "deployment-uid", Value: matchingDeployment.ObjectMeta.UID},
			telemetry.AttributeKV{Key: "deployment-creation-timestamp", Value: matchingDeployment.ObjectMeta.CreationTimestamp},
		)
		status = k8sDeploymentStatus(matchingDeployment)
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-status", Value: status})
	if status == DeploymentStatus_Unknown {
		err := telemetry.Error(ctx, span, nil, "unable to determine status of deployment")
		return hydratedNotification, err
	}

	hydratedNotification.Deployment = Deployment{
		Status: status,
	}

	return hydratedNotification, nil
}

// porterAppDeployEventStatusInput is the input struct for porterAppDeployEventStatus
type porterAppDeployEventStatusInput struct {
	// AppID is the ID of the app
	AppID string
	// EventRepo is the repository for app events, used to check if we've already marked this deployment as successful/failed
	EventRepo repository.PorterAppEventRepository
	// AppRevisionID is the ID of the app revision
	AppRevisionID string
	// ServiceName is the name of the service
	ServiceName string
}

// porterAppDeployEventStatus returns the status of a deploy event from the app events repository
func porterAppDeployEventStatus(ctx context.Context, inp porterAppDeployEventStatusInput) (DeploymentStatus, error) {
	ctx, span := telemetry.NewSpan(ctx, "db-deploy-event-status")
	defer span.End()

	deploymentStatus := DeploymentStatus_Unknown

	appIdInt, err := strconv.Atoi(inp.AppID)
	if err != nil {
		return deploymentStatus, telemetry.Error(ctx, span, err, "failed to convert app id to int")
	}
	matchingDeployEvent, err := inp.EventRepo.ReadDeployEventByAppRevisionID(ctx, uint(appIdInt), inp.AppRevisionID)
	if err != nil {
		return deploymentStatus, telemetry.Error(ctx, span, err, "failed to read deploy event by app revision id")
	}

	serviceDeploymentMetadata, err := serviceDeploymentMetadataFromDeployEvent(ctx, matchingDeployEvent, inp.ServiceName)
	if err != nil {
		return deploymentStatus, telemetry.Error(ctx, span, err, "failed to get service deployment metadata from deploy event")
	}

	switch serviceDeploymentMetadata.Status {
	case PorterAppEventStatus_Success:
		deploymentStatus = DeploymentStatus_Success
	case PorterAppEventStatus_Failed:
		deploymentStatus = DeploymentStatus_Failure
	case PorterAppEventStatus_Progressing:
		deploymentStatus = DeploymentStatus_Pending
	default:
		deploymentStatus = DeploymentStatus_Unknown
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-status", Value: string(deploymentStatus)})

	return deploymentStatus, nil
}

// k8sDeploymentStatus returns the status of a k8s deployment
func k8sDeploymentStatus(depl v1.Deployment) DeploymentStatus {
	deploymentStatus := DeploymentStatus_Unknown

	if depl.Status.Replicas == depl.Status.ReadyReplicas &&
		depl.Status.Replicas == depl.Status.AvailableReplicas &&
		depl.Status.Replicas == depl.Status.UpdatedReplicas {
		deploymentStatus = DeploymentStatus_Success
	} else {
		for _, condition := range depl.Status.Conditions {
			if condition.Type == "Progressing" {
				if condition.Status == "False" && condition.Reason == "ProgressDeadlineExceeded" {
					deploymentStatus = DeploymentStatus_Failure
					break
				} else {
					deploymentStatus = DeploymentStatus_Pending
				}
			}
		}
	}

	return deploymentStatus
}

var fatalDeploymentErrorCodes = []porter_error.PorterErrorCode{
	porter_error.PorterErrorCode_NonZeroExitCode,
	porter_error.PorterErrorCode_NonZeroExitCode_InvalidStartCommand,
	porter_error.PorterErrorCode_NonZeroExitCode_CommonIssues,
	porter_error.PorterErrorCode_ReadinessHealthCheck,
	porter_error.PorterErrorCode_LivenessHealthCheck,
	porter_error.PorterErrorCode_InvalidImageError,
	porter_error.PorterErrorCode_RestartedDueToError,
	porter_error.PorterErrorCode_MemoryLimitExceeded_ScaleUp,
	porter_error.PorterErrorCode_CPULimitExceeded_ScaleUp,
}

// errorCodeIndicatesDeploymentFailure returns true if the error code indicates that the deployment will eventually time out and fail
// we use this to report deployment failure to the user early, rather than waiting for the deployment to time out
func errorCodeIndicatesDeploymentFailure(errorCode porter_error.PorterErrorCode) bool {
	// if any of the fatal deployment error codes matches the provided error code, then the deployment will fail
	for _, fatalErrorCode := range fatalDeploymentErrorCodes {
		if errorCode == fatalErrorCode {
			return true
		}
	}
	return false
}
