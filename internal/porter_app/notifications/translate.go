package notifications

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/porter-dev/porter/internal/porter_app/notifications/porter_error"
	"github.com/porter-dev/porter/internal/telemetry"
)

// hydrateNotificationWithError translates information from the agent into a user-facing form
func hydrateNotificationWithError(ctx context.Context, notification Notification) Notification {
	ctx, span := telemetry.NewSpan(ctx, "hydrate-notification-with-user-facing-details")
	defer span.End()

	hydratedNotification := notification

	errorCode := porter_error.ErrorCode(hydratedNotification.AgentSummary, hydratedNotification.AgentDetail)
	porterError := createError(ctx, errorCode, hydratedNotification.AgentSummary, hydratedNotification.AgentDetail, hydratedNotification.ServiceName)

	hydratedNotification.Error = porterError

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "agent-summary", Value: hydratedNotification.AgentSummary},
		telemetry.AttributeKV{Key: "human-readable-summary", Value: hydratedNotification.Error.Summary},
		telemetry.AttributeKV{Key: "agent-detail", Value: hydratedNotification.AgentDetail},
		telemetry.AttributeKV{Key: "human-readable-detail", Value: hydratedNotification.Error.Detail},
		telemetry.AttributeKV{Key: "error-code", Value: hydratedNotification.Error.Code},
	)

	return hydratedNotification
}

// createError creates a PorterError from a PorterErrorCode, falling back to agent info if the error code is unknown
func createError(ctx context.Context, errorCode porter_error.PorterErrorCode, agentSummary, agentDetail, serviceName string) porter_error.PorterError {
	ctx, span := telemetry.NewSpan(ctx, "create-error")
	defer span.End()

	porterError := porter_error.PorterError{
		Code:    errorCode,
		Summary: translateAgentSummary(agentSummary, serviceName),
		Detail:  strings.ReplaceAll(agentDetail, "application", "service"),
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "agent-summary", Value: agentSummary},
		telemetry.AttributeKV{Key: "agent-detail", Value: agentDetail},
		telemetry.AttributeKV{Key: "error-code", Value: string(errorCode)},
	)

	errorDetailsProvider, ok := porter_error.ErrorCodeToProvider[errorCode]
	if ok {
		porterError.Detail = errorDetailsProvider.Detail(agentDetail)
		porterError.MitigationSteps = errorDetailsProvider.MitigationSteps(agentDetail)
		porterError.Documentation = errorDetailsProvider.Documentation()
	}

	// if we do not know the error, or the error is a generic non-zero exit code, we report error so that we can handle it later, but we do not block
	if !ok || errorCode == porter_error.PorterErrorCode_NonZeroExitCode {
		_ = telemetry.Error(ctx, span, nil, "unhandled error code, passing along raw agent details")
	}

	return porterError
}

// translateAgentSummary translates the agent summary to a human readable summary
// this is necessary until we make updates to the agent
func translateAgentSummary(agentSummary, serviceName string) string {
	humanReadableSummary := agentSummary
	// Example summary from the agent: "Your application test-1 in namespace default has crashed because the application was restarted due to an error"
	// We want to replace all instances of "application" with "service"
	pattern := `application (\S+) in namespace (\S+)`
	regex := regexp.MustCompile(pattern)
	if regex.MatchString(humanReadableSummary) {
		humanReadableSummary = regex.ReplaceAllString(humanReadableSummary, fmt.Sprintf("service %s", serviceName))
	}
	humanReadableSummary = strings.ReplaceAll(humanReadableSummary, "application", "service")
	humanReadableSummary = strings.ReplaceAll(humanReadableSummary, "cpu", "CPU")
	// We just want the reason, so we only take the part after "because "
	// If we can't parse the summary, we just return the original summary with the replacement done above
	parts := strings.SplitAfter(humanReadableSummary, "because ")
	if len(parts) == 2 {
		humanReadableSummary = parts[1]
		if len(humanReadableSummary) > 1 {
			humanReadableSummary = strings.ToUpper(string(humanReadableSummary[0])) + humanReadableSummary[1:]
		}
	}
	return humanReadableSummary
}
