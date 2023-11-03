package notifications

import (
	"regexp"
	"strings"
)

type PorterErrorCode int

const (
	PorterErrorCode_Unknown                             PorterErrorCode = 0
	PorterErrorCode_NonZeroExitCode                     PorterErrorCode = 10
	PorterErrorCode_NonZeroExitCode_SIGKILL             PorterErrorCode = 11
	PorterErrorCode_NonZeroExitCode_InvalidStartCommand PorterErrorCode = 12
	PorterErrorCode_NonZeroExitCode_CommonIssues        PorterErrorCode = 13
	PorterErrorCode_LivenessHealthCheck                 PorterErrorCode = 20
	PorterErrorCode_ReadinessHealthCheck                PorterErrorCode = 30
	PorterErrorCode_RestartedDueToError                 PorterErrorCode = 40
	PorterErrorCode_InvalidImageError                   PorterErrorCode = 50
)

// errorCode parses the agent summary and possibly the detail (if it needs supplemental info) to return a standard Porter error code
func errorCode(agentSummary, agentDetail string) PorterErrorCode {
	errorCode := PorterErrorCode_Unknown

	if strings.Contains(agentSummary, "non-zero exit code") {
		return nonZeroExitCodeErrorCode(agentDetail)
	}

	if strings.Contains(agentSummary, "liveness health check") {
		return PorterErrorCode_LivenessHealthCheck
	}

	if strings.Contains(agentSummary, "readiness health check") {
		return PorterErrorCode_ReadinessHealthCheck
	}

	if strings.Contains(agentSummary, "restarted due to an error") {
		return PorterErrorCode_RestartedDueToError
	}

	if strings.Contains(agentSummary, "invalid image") {
		return PorterErrorCode_InvalidImageError
	}

	return errorCode
}

func nonZeroExitCodeErrorCode(agentDetail string) PorterErrorCode {
	errorCode := PorterErrorCode_NonZeroExitCode
	pattern := `restarted with exit code (\S+)`
	regex := regexp.MustCompile(pattern)
	matches := regex.FindStringSubmatch(agentDetail)
	if len(matches) != 2 {
		return errorCode
	}

	exitCode := matches[1]
	switch exitCode {
	case "1":
		return PorterErrorCode_NonZeroExitCode_CommonIssues
	case "127":
		return PorterErrorCode_NonZeroExitCode_InvalidStartCommand
	case "137":
		return PorterErrorCode_NonZeroExitCode_SIGKILL
	default:
		return errorCode
	}
}
