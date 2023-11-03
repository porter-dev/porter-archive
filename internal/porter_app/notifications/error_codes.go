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

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "agent-summary", Value: hydratedNotification.AgentSummary},
		telemetry.AttributeKV{Key: "human-readable-summary", Value: hydratedNotification.HumanReadableSummary},
		telemetry.AttributeKV{Key: "agent-detail", Value: hydratedNotification.AgentDetail},
		telemetry.AttributeKV{Key: "human-readable-detail", Value: hydratedNotification.HumanReadableDetail},
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
	// We just want the reason, so we only take the part after "because "
	// If we can't parse the summary, we just return the original summary (with "application" replaced with "service")
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
	return humanReadableDetail
}
