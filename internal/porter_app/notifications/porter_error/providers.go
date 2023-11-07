package porter_error

import (
	"fmt"
	"regexp"
)

// ErrorDetailsProvider is the parent interface for populating error details, mitigation steps, and documentation.
type ErrorDetailsProvider interface {
	Detail(rawAgentDetail string) string
	MitigationSteps(rawAgentDetail string) string
	Documentation(rawAgentDetail string) []string
}

// ErrorCodeToProvider maps PorterErrorCode to their respective ErrorDetailsProvider implementations.
var ErrorCodeToProvider = map[PorterErrorCode]ErrorDetailsProvider{
	PorterErrorCode_NonZeroExitCode:                     &NonZeroExitCodeErrorProvider{},
	PorterErrorCode_NonZeroExitCode_SIGKILL:             &NonZeroExitCodeErrorProvider{},
	PorterErrorCode_NonZeroExitCode_InvalidStartCommand: &NonZeroExitCodeErrorProvider{},
	PorterErrorCode_NonZeroExitCode_CommonIssues:        &NonZeroExitCodeErrorProvider{},
	PorterErrorCode_LivenessHealthCheck:                 &LivenessHealthCheckErrorProvider{},
	PorterErrorCode_ReadinessHealthCheck:                &ReadinessHealthCheckErrorProvider{},
	PorterErrorCode_RestartedDueToError:                 &RestartedDueToErrorProvider{},
	PorterErrorCode_InvalidImageError:                   &InvalidImageErrorProvider{},
	PorterErrorCode_MemoryLimitExceeded:                 &MemoryLimitExceededErrorProvider{},
}

// NonZeroExitCodeErrorProvider provides error details for NonZeroExitCode errors.
type NonZeroExitCodeErrorProvider struct{}

func (e *NonZeroExitCodeErrorProvider) Detail(rawAgentDetail string) string {
	humanReadableDetail := rawAgentDetail
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
		return fmt.Sprintf("%s This indicates that the service was killed by SIGKILL. The most common reason for this is that your service does not handle graceful shutdown when it receives a SIGTERM signal.", prefix)
	case "1":
		return fmt.Sprintf("%s This indicates common issues.", prefix)
	case "127":
		return fmt.Sprintf("%s This indicates that the service has a misconfigured start command.", prefix)
	default:
		return prefix
	}
}

func (e *NonZeroExitCodeErrorProvider) MitigationSteps(rawAgentDetail string) string {
	mitigationSteps := "Please consult our documentation for further guidance. If you need additional help, please reach out to us at support@porter.run."
	// Example detail from the agent: "restarted with exit code 137"
	// We want to get the exit code
	pattern := `restarted with exit code (\S+)`
	regex := regexp.MustCompile(pattern)
	matches := regex.FindStringSubmatch(rawAgentDetail)
	if len(matches) != 2 {
		return mitigationSteps
	}

	exitCode := matches[1]
	switch exitCode {
	case "137":
		return "Please make sure that your service handles graceful shutdown when it receives a SIGTERM signal. After receiving SIGTERM, your service should close existing connections and terminate with exit code 0."
	case "1":
		return "Check container logs for further troubleshooting."
	case "127":
		return "Please verify that the service start command is correct and redeploy."
	default:
		return mitigationSteps
	}
}

func (e *NonZeroExitCodeErrorProvider) Documentation(rawAgentDetail string) []string {
	docLinks := []string{
		"https://docs.porter.run/enterprise/managing-applications/application-troubleshooting#application-issues-and-non-zero-exit-codes",
	}
	// Example detail from the agent: "restarted with exit code 137"
	// We want to get the exit code
	pattern := `restarted with exit code (\S+)`
	regex := regexp.MustCompile(pattern)
	matches := regex.FindStringSubmatch(rawAgentDetail)
	if len(matches) != 2 {
		return docLinks
	}

	exitCode := matches[1]
	switch exitCode {
	case "137":
		docLinks = append(docLinks, "https://docs.porter.run/enterprise/deploying-applications/zero-downtime-deployments#graceful-shutdown")
	}

	return docLinks
}

// LivenessHealthCheckErrorProvider provides error details for LivenessHealthCheck errors.
type LivenessHealthCheckErrorProvider struct{}

func (e *LivenessHealthCheckErrorProvider) Detail(rawAgentDetail string) string {
	humanReadableDetail := rawAgentDetail
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

func (e *LivenessHealthCheckErrorProvider) MitigationSteps(rawAgentDetail string) string {
	// Implement logic to populate mitigation steps for LivenessHealthCheck errors
	return ""
}

func (e *LivenessHealthCheckErrorProvider) Documentation(rawAgentDetail string) []string {
	// Implement logic to populate documentation links for LivenessHealthCheck errors
	return []string{}
}

// ReadinessHealthCheckErrorProvider provides error details for ReadinessHealthCheck errors.
type ReadinessHealthCheckErrorProvider struct{}

func (e *ReadinessHealthCheckErrorProvider) Detail(rawAgentDetail string) string {
	humanReadableDetail := rawAgentDetail
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

func (e *ReadinessHealthCheckErrorProvider) MitigationSteps(rawAgentDetail string) string {
	// Implement logic to populate mitigation steps for ReadinessHealthCheck errors
	return ""
}

func (e *ReadinessHealthCheckErrorProvider) Documentation(rawAgentDetail string) []string {
	// Implement logic to populate documentation links for ReadinessHealthCheck errors
	return []string{}
}

// RestartedDueToErrorProvider provides error details for RestartedDueToError errors.
type RestartedDueToErrorProvider struct{}

func (e *RestartedDueToErrorProvider) Detail(rawAgentDetail string) string {
	return "The service is stuck in a restart loop. This is likely due to another error."
}

func (e *RestartedDueToErrorProvider) MitigationSteps(rawAgentDetail string) string {
	// Implement logic to populate mitigation steps for RestartedDueToError errors
	return ""
}

func (e *RestartedDueToErrorProvider) Documentation(rawAgentDetail string) []string {
	// Implement logic to populate documentation links for RestartedDueToError errors
	return []string{}
}

// InvalidImageErrorProvider provides error details for InvalidImageError errors.
type InvalidImageErrorProvider struct{}

func (e *InvalidImageErrorProvider) Detail(rawAgentDetail string) string {
	return "The service cannot pull from the image registry. This is likely due to an invalid image name or bad credentials."
}

func (e *InvalidImageErrorProvider) MitigationSteps(rawAgentDetail string) string {
	// Implement logic to populate mitigation steps for InvalidImageError errors
	return ""
}

func (e *InvalidImageErrorProvider) Documentation(rawAgentDetail string) []string {
	// Implement logic to populate documentation links for InvalidImageError errors
	return []string{}
}

// MemoryLimitExceededErrorProvider provides error details for MemoryLimitExceededError errors.
type MemoryLimitExceededErrorProvider struct{}

func (e *MemoryLimitExceededErrorProvider) Detail(rawAgentDetail string) string {
	// Example detail from the agent: "Your service was restarted because it exceeded its memory limit of 4M..."
	// We want to get the memory limit
	pattern := `exceeded its memory limit of (\S+)\.`
	regex := regexp.MustCompile(pattern)
	matches := regex.FindStringSubmatch(rawAgentDetail)
	if len(matches) != 2 {
		return rawAgentDetail
	}
	memoryLimit := matches[1]

	return fmt.Sprintf("The service exceeded its memory limit of %s.", memoryLimit)
}

func (e *MemoryLimitExceededErrorProvider) MitigationSteps(rawAgentDetail string) string {
	// Implement logic to populate mitigation steps for MemoryLimitExceededError errors
	return ""
}

func (e *MemoryLimitExceededErrorProvider) Documentation(rawAgentDetail string) []string {
	// Implement logic to populate documentation links for MemoryLimitExceededError errors
	return []string{}
}
