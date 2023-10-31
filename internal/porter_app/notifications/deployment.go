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

type Deployment struct {
	Status DeploymentStatus `json:"status"`
}

type DeploymentStatus string

const (
	DeploymentStatus_Unknown DeploymentStatus = "UNKNOWN"
	DeploymentStatus_Pending DeploymentStatus = "PENDING"
	DeploymentStatus_Success DeploymentStatus = "SUCCESS"
	DeploymentStatus_Failure DeploymentStatus = "FAILURE"
)

type hydrateNotificationInput struct {
	Notification
	DeploymentTargetId string
	Namespace          string
	K8sAgent           *kubernetes.Agent
}

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

	return hydratedNotification, nil
}

func deploymentStatus(depl v1.Deployment) DeploymentStatus {
	deploymentStatus := DeploymentStatus_Unknown

	for _, condition := range depl.Status.Conditions {
		if condition.Type == "Progressing" {
			if condition.Status == "True" && condition.Reason == "NewReplicaSetAvailable" && depl.Status.ReadyReplicas == depl.Status.Replicas {
				deploymentStatus = DeploymentStatus_Success
				break
			} else if condition.Status == "False" && condition.Reason == "ProgressDeadlineExceeded" {
				deploymentStatus = DeploymentStatus_Failure
				break
			} else {
				deploymentStatus = DeploymentStatus_Pending
			}
		}
	}

	return deploymentStatus
}

var fatalDeploymentDetailSubstrings = []string{
	"stuck in a restart loop",
	"restarted with exit code",
}

func detailIndicatesDeploymentFailure(detail string) bool {
	// if any of the fatal deployment detail substrings are found in the detail, then the deployment will fail
	for _, fatalSubstring := range fatalDeploymentDetailSubstrings {
		if strings.Contains(detail, fatalSubstring) {
			return true
		}
	}
	return false
}

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
