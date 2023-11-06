package notifications

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/porter-dev/porter/internal/telemetry"
)

// hydrateNotificationWithUserFacingDetails translates information from the agent into a user-facing form
func hydrateNotificationWithUserFacingDetails(ctx context.Context, notification Notification) Notification {
	_, span := telemetry.NewSpan(ctx, "hydrate-notification-with-user-facing-details")
	defer span.End()

	hydratedNotification := notification

	hydratedNotification.HumanReadableSummary = translateAgentSummary(hydratedNotification)
	hydratedNotification.HumanReadableDetail = translateAgentDetail(hydratedNotification)

	errorCode := errorCode(hydratedNotification.AgentSummary, hydratedNotification.AgentDetail)
	hydratedNotification.ErrorCode = errorCode
	hydratedNotification.MitigationSteps = mitigationSteps(errorCode)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "agent-summary", Value: hydratedNotification.AgentSummary},
		telemetry.AttributeKV{Key: "human-readable-summary", Value: hydratedNotification.HumanReadableSummary},
		telemetry.AttributeKV{Key: "agent-detail", Value: hydratedNotification.AgentDetail},
		telemetry.AttributeKV{Key: "human-readable-detail", Value: hydratedNotification.HumanReadableDetail},
		telemetry.AttributeKV{Key: "error-code", Value: hydratedNotification.ErrorCode},
	)

	return hydratedNotification
}

// translateAgentSummary translates the agent summary to a human readable summary
// this is necessary until we make updates to the agent
func translateAgentSummary(notification Notification) string {
	humanReadableSummary := notification.AgentSummary
	// Example summary from the agent: "Your application test-1 in namespace default has crashed because the application was restarted due to an error"
	// We want to replace all instances of "application" with "service"
	pattern := `application (\S+) in namespace (\S+)`
	regex := regexp.MustCompile(pattern)
	if regex.MatchString(humanReadableSummary) {
		humanReadableSummary = regex.ReplaceAllString(humanReadableSummary, fmt.Sprintf("service %s", notification.ServiceName))
	}
	humanReadableSummary = strings.ReplaceAll(humanReadableSummary, "application", "service")
	humanReadableSummary = strings.ReplaceAll(humanReadableSummary, "cpu", "CPU")
	// We just want the reason, so we only take the part after "because "
	// If we can't parse the summary, we just return the original summary with the replacement done above
	parts := strings.SplitAfter(humanReadableSummary, "because ")
	if len(parts) == 2 {
		humanReadableSummary = parts[1]
	}
	return humanReadableSummary
}

// translateAgentDetail translates the agent detail to a human readable detail
// this is necessary until we make updates to the agent
func translateAgentDetail(notification Notification) string {
	humanReadableDetail := notification.AgentDetail
	humanReadableDetail = strings.ReplaceAll(humanReadableDetail, "application", "service")

	if strings.Contains(notification.AgentSummary, "non-zero exit code") {
		return nonZeroExitCodeDetail(humanReadableDetail)
	}

	if strings.Contains(notification.AgentSummary, "liveness health check") {
		return livenessHealthCheckDetail(humanReadableDetail)
	}

	if strings.Contains(notification.AgentSummary, "readiness health check") {
		return readinessHealthCheckDetail(humanReadableDetail)
	}

	if strings.Contains(notification.AgentSummary, "restarted due to an error") {
		return restartedDueToErrorDetail(humanReadableDetail)
	}

	if strings.Contains(notification.AgentSummary, "invalid image") {
		return invalidImageDetail(humanReadableDetail)
	}

	if strings.Contains(notification.AgentDetail, "exceeded its memory limit") {
		return exceededMemoryLimitDetail(humanReadableDetail)
	}

	return humanReadableDetail
}

// nonZeroExitCodeDetail translates the agent detail to a human readable detail for non-zero exit code errors
func nonZeroExitCodeDetail(agentDetail string) string {
	humanReadableDetail := agentDetail
	// Example detail from the agent: "restarted with exit code 137"
	// We want to get the exit code
	pattern := `restarted with exit code (\S+)`
	regex := regexp.MustCompile(pattern)
	matches := regex.FindStringSubmatch(humanReadableDetail)
	if len(matches) != 2 {
		return humanReadableDetail
	}

	exitCode := matches[1]
	prefix := fmt.Sprintf("The service restarted with exit code %s.", exitCode)
	switch exitCode {
	case "137":
		return fmt.Sprintf("%s This indicates that the service was killed by SIGKILL. The most common reason for this is that your service does not handle graceful shutdown when it receives a SIGTERM signal. After receiving SIGTERM, your service should close existing connections and terminate with exit code 0.", prefix)
	case "1":
		return fmt.Sprintf("%s This indicates common issues.", prefix)
	case "127":
		return fmt.Sprintf("%s This indicates that the service has a misconfigured start command.", prefix)
	default:
		return prefix
	}
}

// livenessHealthCheckDetail translates the agent detail to a human readable detail for liveness health check errors
func livenessHealthCheckDetail(agentDetail string) string {
	humanReadableDetail := agentDetail
	// Example detail from the agent: "...Your liveness health check is set to the path /healthz..."
	// We want to strip out the path
	pattern := `Your liveness health check is set to the path (\S+)\.`
	regex := regexp.MustCompile(pattern)
	matches := regex.FindStringSubmatch(humanReadableDetail)
	if len(matches) != 2 {
		return humanReadableDetail
	}
	pathValue := matches[1]
	return fmt.Sprintf("The liveness health check for this service is set to the path %s. The service is not responding with a 200-level response code on this endpoint, so it is continuously restarting.", pathValue)
}

// readinessHealthCheckDetail translates the agent detail to a human readable detail for readiness health check errors
func readinessHealthCheckDetail(agentDetail string) string {
	humanReadableDetail := agentDetail
	// Example detail from the agent: "...Your readiness health check is set to the path /healthz..."
	// We want to strip out the path
	pattern := `Your readiness health check is set to the path (\S+)\.`
	regex := regexp.MustCompile(pattern)
	matches := regex.FindStringSubmatch(humanReadableDetail)
	if len(matches) != 2 {
		return humanReadableDetail
	}
	pathValue := matches[1]
	return fmt.Sprintf("The readiness health check for this service is set to the path %s. The service is not responding with a 200-level response code on this endpoint, so it is continuously restarting.", pathValue)
}

// restartedDueToErrorDetail translates the agent detail to a human readable detail for "restarted due to error" errors
func restartedDueToErrorDetail(agentDetail string) string {
	return "The service is stuck in a restart loop. This is likely due to another error."
}

// invalidImageDetail translates the agent detail to a human readable detail for "invalid image" errors
func invalidImageDetail(agentDetail string) string {
	return "The service cannot pull from the image registry. This is likely due to an invalid image name or bad credentials."
}

// exceededMemoryLimitDetail translates the agent detail to a human readable detail for "exceeded memory limit" errors
func exceededMemoryLimitDetail(agentDetail string) string {
	// Example detail from the agent: "Your service was restarted because it exceeded its memory limit of 4M..."
	// We want to get the memory limit
	pattern := `exceeded its memory limit of (\S+)\.`
	regex := regexp.MustCompile(pattern)
	matches := regex.FindStringSubmatch(agentDetail)
	if len(matches) != 2 {
		return agentDetail
	}
	memoryLimit := matches[1]

	return fmt.Sprintf("The service exceeded its memory limit of %s.", memoryLimit)
}

func mitigationSteps(errorCode PorterErrorCode) string {
	// TODO: populate mitigation steps
	return ""
}
