package notifications

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/porter-dev/porter/internal/kubernetes"
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

// hydrateNotificationInput is the input struct for hydrateNotification
type hydrateNotificationInput struct {
	// Notification is the notification to hydrate
	Notification
	// DeploymentTargetId is the ID of the deployment target
	DeploymentTargetId string
	// Namespace is the namespace of the deployment target
	Namespace string
	// K8sAgent is the k8s agent, used to query for deployment info
	K8sAgent *kubernetes.Agent
}

// hydrateNotification hydrates a notification with k8s deployment info, and translates information from the agent into a user-facing form
func hydrateNotification(ctx context.Context, inp hydrateNotificationInput) (Notification, error) {
	ctx, span := telemetry.NewSpan(ctx, "hydrate-notification")
	defer span.End()

	hydratedNotification := inp.Notification

	if inp.Notification.Deployment.Status != DeploymentStatus_Unknown {
		return hydratedNotification, nil
	}

	if inp.K8sAgent == nil {
		err := telemetry.Error(ctx, span, nil, "k8s agent is nil")
		return hydratedNotification, err
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "deployment-target-id", Value: inp.DeploymentTargetId},
		telemetry.AttributeKV{Key: "namespace", Value: inp.Namespace},
		telemetry.AttributeKV{Key: "app-name", Value: inp.AppName},
		telemetry.AttributeKV{Key: "app-revision-id", Value: inp.Notification.AppRevisionID},
		telemetry.AttributeKV{Key: "service-name", Value: inp.ServiceName},
	)

	selectors := []string{
		fmt.Sprintf("porter.run/deployment-target-id=%s", inp.DeploymentTargetId),
		fmt.Sprintf("porter.run/app-name=%s", inp.AppName),
		fmt.Sprintf("porter.run/app-revision-id=%s", inp.Notification.AppRevisionID),
		fmt.Sprintf("porter.run/service-name=%s", inp.ServiceName),
	}
	depls, err := inp.K8sAgent.GetDeploymentsBySelector(inp.Namespace, strings.Join(selectors, ","))
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
	status := deploymentStatus(matchingDeployment)
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-status", Value: status})
	if status == DeploymentStatus_Unknown {
		err := telemetry.Error(ctx, span, nil, "unable to determine status of deployment")
		return hydratedNotification, err
	}

	hydratedNotification.Deployment = Deployment{
		Status: status,
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "agent-summary", Value: hydratedNotification.AgentSummary})
	hydratedNotification.HumanReadableSummary = translateAgentSummary(hydratedNotification, status)
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "human-readable-summary", Value: hydratedNotification.HumanReadableSummary})

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "agent-detail", Value: hydratedNotification.AgentDetail})
	hydratedNotification.HumanReadableDetail = translateAgentDetail(hydratedNotification)
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "human-readable-detail", Value: hydratedNotification.HumanReadableDetail})

	return hydratedNotification, nil
}

// deploymentStatus returns the status of a k8s deployment
func deploymentStatus(depl v1.Deployment) DeploymentStatus {
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

var fatalDeploymentDetailSubstrings = []string{
	"stuck in a restart loop",
	"restarted with exit code",
	"failed its health check",
}

// detailIndicatesDeploymentFailure returns true if the detail indicates that the deployment failed
func detailIndicatesDeploymentFailure(detail string) bool {
	// if any of the fatal deployment detail substrings are found in the detail, then the deployment will fail
	for _, fatalSubstring := range fatalDeploymentDetailSubstrings {
		if strings.Contains(detail, fatalSubstring) {
			return true
		}
	}
	return false
}

// translateAgentSummary translates the agent summary to a human readable summary
// this is necessary until we make updates to the agent
func translateAgentSummary(notification Notification, status DeploymentStatus) string {
	humanReadableSummary := notification.AgentSummary
	pattern := `application (\S+) in namespace (\S+)`
	regex := regexp.MustCompile(pattern)
	if regex.MatchString(humanReadableSummary) {
		fmt.Printf("matched regex\n")
		humanReadableSummary = regex.ReplaceAllString(humanReadableSummary, fmt.Sprintf("service %s", notification.ServiceName))
	}
	humanReadableSummary = strings.ReplaceAll(humanReadableSummary, "application", "service")
	if status == DeploymentStatus_Pending {
		humanReadableSummary = strings.ReplaceAll(humanReadableSummary, "has crashed", "failed to deploy")
		humanReadableSummary = strings.ReplaceAll(humanReadableSummary, "crashed", "failed to deploy")
		humanReadableSummary = strings.ReplaceAll(humanReadableSummary, "is currently experiencing downtime", "failed to deploy")
	}
	return humanReadableSummary
}

func translateAgentDetail(notification Notification) string {
	humanReadableDetail := notification.AgentDetail
	humanReadableDetail = strings.ReplaceAll(humanReadableDetail, "application", "service")
	return humanReadableDetail
}
