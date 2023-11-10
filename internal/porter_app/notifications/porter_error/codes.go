package porter_error

import (
	"regexp"
	"strings"
)

// PorterError is the translation of a generic error from the agent into an actionable error for the user
type PorterError struct {
	// Code is the error code that can be used to determine the type of error
	Code PorterErrorCode `json:"code"`
	// Summary is a short description of the error
	Summary string `json:"summary"`
	// Detail is a longer description of the error
	Detail string `json:"detail"`
	// MitigationSteps are the steps that can be taken to resolve the error
	MitigationSteps string `json:"mitigation_steps"`
	// Documentation is a list of links to documentation that can be used to resolve the error
	Documentation []string `json:"documentation"`
}

// PorterErrorCode is the error code that can be used to determine the type of error
type PorterErrorCode int

const (
	// PorterErrorCode_Unknown is the default error code
	PorterErrorCode_Unknown PorterErrorCode = 0
	// PorterErrorCode_NonZeroExitCode is the error code for a generic non-zero exit code
	PorterErrorCode_NonZeroExitCode PorterErrorCode = 10
	// PorterErrorCode_NonZeroExitCode_SIGKILL is the error code for a non-zero exit code due to a SIGKILL
	PorterErrorCode_NonZeroExitCode_SIGKILL PorterErrorCode = 11
	// PorterErrorCode_NonZeroExitCode_InvalidStartCommand is the error code for a non-zero exit code due to an invalid start command
	PorterErrorCode_NonZeroExitCode_InvalidStartCommand PorterErrorCode = 12
	// PorterErrorCode_NonZeroExitCode_CommonIssues is the error code for a non-zero exit code due to common issues
	PorterErrorCode_NonZeroExitCode_CommonIssues PorterErrorCode = 13
	// PorterErrorCode_LivenessHealthCheck is the error code for a failed liveness health check
	PorterErrorCode_LivenessHealthCheck PorterErrorCode = 20
	// PorterErrorCode_ReadinessHealthCheck is the error code for a failed readiness health check
	PorterErrorCode_ReadinessHealthCheck PorterErrorCode = 30
	// PorterErrorCode_RestartedDueToError is the error code for a restart due to an error
	PorterErrorCode_RestartedDueToError PorterErrorCode = 40
	// PorterErrorCode_InvalidImageError is the error code for an invalid image
	PorterErrorCode_InvalidImageError PorterErrorCode = 50
	// PorterErrorCode_MemoryLimitExceeded is the error code for a memory limit exceeded
	PorterErrorCode_MemoryLimitExceeded PorterErrorCode = 60
	// PorterErrorCode_MemoryLimitExceeded_ScaleUp is the error code for a memory limit exceeded when scaling up
	PorterErrorCode_MemoryLimitExceeded_ScaleUp PorterErrorCode = 61
	// PorterErrorCode_CPULimitExceeded is the error code for a CPU limit exceeded
	PorterErrorCode_CPULimitExceeded PorterErrorCode = 70
	// PorterErrorCode_CPULimitExceeded_ScaleUp is the error code for a CPU limit exceeded when scaling up
	PorterErrorCode_CPULimitExceeded_ScaleUp PorterErrorCode = 71
	// PorterErrorCode_CannotBeScheduled is the error code for a pod that cannot be scheduled
	PorterErrorCode_CannotBeScheduled PorterErrorCode = 80
)

// ErrorCode parses the agent summary and possibly the detail (if it needs supplemental info) to return a standard Porter error code
func ErrorCode(agentSummary, agentDetail string) PorterErrorCode {
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

	if strings.Contains(agentSummary, "ran out of memory") {
		return PorterErrorCode_MemoryLimitExceeded
	}

	if strings.Contains(agentSummary, "requesting too much memory and cannot scale up") {
		return PorterErrorCode_MemoryLimitExceeded_ScaleUp
	}

	if strings.Contains(agentSummary, "requesting more cpu than is available") {
		return PorterErrorCode_CPULimitExceeded
	}

	if strings.Contains(agentSummary, "requesting too much cpu and cannot scale up") {
		return PorterErrorCode_CPULimitExceeded_ScaleUp
	}

	if strings.Contains(agentSummary, "cannot be scheduled") {
		return PorterErrorCode_CannotBeScheduled
	}

	return errorCode
}

// nonZeroExitCodeErrorCode parses the agent detail for non-zero exit code errors to return a standard Porter error code
func nonZeroExitCodeErrorCode(agentDetail string) PorterErrorCode {
	errorCode := PorterErrorCode_NonZeroExitCode
	regex := regexp.MustCompile(restartedWithErrorCodePattern)
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
