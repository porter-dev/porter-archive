package porter_error

import (
	"fmt"
	"regexp"
)

// ErrorDetailsProvider is the parent interface for populating user-facing info about a Porter Error.
type ErrorDetailsProvider interface {
	// Detail returns the error detail for the given error. E.g. "The service restarted with exit code 137."
	Detail(rawAgentDetail string) string
	// MitigationSteps returns the mitigation steps for the given error. E.g. "Please make sure that your service handles graceful shutdown when it receives a SIGTERM signal."
	MitigationSteps(rawAgentDetail string) string
	// Documentation returns the documentation links that would help with troubleshooting the given error.
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
	PorterErrorCode_CPULimitExceeded:                    &CPULimitExceededErrorProvider{},
}

// NonZeroExitCodeErrorProvider provides error details for NonZeroExitCode errors.
type NonZeroExitCodeErrorProvider struct{}

// Detail returns the error detail for NonZeroExitCode errors, parsing out the exit code from the agent event.
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

// MitigationSteps returns the mitigation steps for NonZeroExitCode errors, parsing out the exit code from the agent event.
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

// Documentation returns the documentation links for NonZeroExitCode errors, parsing out the exit code from the agent event.
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

// Detail returns the error detail for LivenessHealthCheck errors, parsing out the healthcheck endpoint from the agent event.
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

// MitigationSteps returns the mitigation steps for LivenessHealthCheck errors, parsing out the healthcheck endpoint from the agent event.
func (e *LivenessHealthCheckErrorProvider) MitigationSteps(rawAgentDetail string) string {
	mitigationSteps := "Please make sure that your service responds with a 200-level response code on the liveness health check endpoint."
	// Example detail from the agent: "...Your liveness health check is set to the path /healthz..."
	// We want to strip out the path
	pattern := `Your liveness health check is set to the path (\S+)\.`
	regex := regexp.MustCompile(pattern)
	matches := regex.FindStringSubmatch(rawAgentDetail)
	if len(matches) != 2 {
		return mitigationSteps
	}
	pathValue := matches[1]
	return fmt.Sprintf("Please make sure that your service responds with a 200-level response code on the liveness health check endpoint %s.", pathValue)
}

// Documentation returns the documentation links for LivenessHealthCheck errors.
func (e *LivenessHealthCheckErrorProvider) Documentation(rawAgentDetail string) []string {
	return []string{
		"https://docs.porter.run/standard/deploying-applications/zero-downtime-deployments#health-checks",
		"https://docs.porter.run/standard/deploying-applications/zero-downtime-deployments#graceful-shutdown",
	}
}

// ReadinessHealthCheckErrorProvider provides error details for ReadinessHealthCheck errors.
type ReadinessHealthCheckErrorProvider struct{}

// Detail returns the error detail for ReadinessHealthCheck errors, parsing out the healthcheck endpoint from the agent event.
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

// MitigationSteps returns the mitigation steps for ReadinessHealthCheck errors, parsing out the healthcheck endpoint from the agent event.
func (e *ReadinessHealthCheckErrorProvider) MitigationSteps(rawAgentDetail string) string {
	mitigationSteps := "Please make sure that your service responds with a 200-level response code on the readiness health check endpoint."
	// Example detail from the agent: "...Your readiness health check is set to the path /healthz..."
	// We want to strip out the path
	pattern := `Your readiness health check is set to the path (\S+)\.`
	regex := regexp.MustCompile(pattern)
	matches := regex.FindStringSubmatch(rawAgentDetail)
	if len(matches) != 2 {
		return mitigationSteps
	}
	pathValue := matches[1]
	return fmt.Sprintf("Please make sure that your service responds with a 200-level response code on the readiness health check endpoint %s.", pathValue)
}

// Documentation returns the documentation links for ReadinessHealthCheck errors.
func (e *ReadinessHealthCheckErrorProvider) Documentation(rawAgentDetail string) []string {
	return []string{
		"https://docs.porter.run/standard/deploying-applications/zero-downtime-deployments#health-checks",
		"https://docs.porter.run/standard/deploying-applications/zero-downtime-deployments#graceful-shutdown",
	}
}

// RestartedDueToErrorProvider provides error details for RestartedDueToError errors.
type RestartedDueToErrorProvider struct{}

// Detail returns the error detail for RestartedDueToError errors.
func (e *RestartedDueToErrorProvider) Detail(rawAgentDetail string) string {
	return "The service is stuck in a restart loop. This is likely due to other errors."
}

// MitigationSteps returns the mitigation steps for RestartedDueToError errors.
func (e *RestartedDueToErrorProvider) MitigationSteps(rawAgentDetail string) string {
	return "Please address other errors if they exist, or check service logs for further troubleshooting."
}

// Documentation returns the documentation links for RestartedDueToError errors.
func (e *RestartedDueToErrorProvider) Documentation(rawAgentDetail string) []string {
	return []string{
		"https://docs.porter.run/enterprise/managing-applications/application-troubleshooting#application-restarts",
	}
}

// InvalidImageErrorProvider provides error details for InvalidImageError errors.
type InvalidImageErrorProvider struct{}

// Detail returns the error detail for InvalidImageError errors.
func (e *InvalidImageErrorProvider) Detail(rawAgentDetail string) string {
	return "The service cannot pull from the image registry. This is likely due to an invalid image name or bad credentials."
}

// MitigationSteps returns the mitigation steps for InvalidImageError errors.
func (e *InvalidImageErrorProvider) MitigationSteps(rawAgentDetail string) string {
	return "Please double check that your image name is correct and that the tag specified exists for that image. If you are attempting to pull from a private registry, please make sure that the registry is correctly linked to your project. You can verify this by going to the Integrations tab -> Docker registry and ensuring that your image repository is listed there."
}

// Documentation returns the documentation links for InvalidImageError errors.
func (e *InvalidImageErrorProvider) Documentation(rawAgentDetail string) []string {
	return []string{
		"https://docs.porter.run/enterprise/managing-applications/application-troubleshooting#image-pull-errors",
		"https://docs.porter.run/enterprise/deploying-applications/deploying-from-docker-registry",
	}
}

// MemoryLimitExceededErrorProvider provides error details for MemoryLimitExceededError errors.
type MemoryLimitExceededErrorProvider struct{}

// Detail returns the error detail for MemoryLimitExceededError errors, parsing out the memory limit from the agent event.
func (e *MemoryLimitExceededErrorProvider) Detail(rawAgentDetail string) string {
	detail := "The service exceeded its memory limit. This may be caused by other errors."
	// Example detail from the agent: "Your service was restarted because it exceeded its memory limit of 4M..."
	// We want to get the memory limit
	pattern := `exceeded its memory limit of (\S+)\.`
	regex := regexp.MustCompile(pattern)
	matches := regex.FindStringSubmatch(rawAgentDetail)
	if len(matches) != 2 {
		return detail
	}
	memoryLimit := matches[1]

	return fmt.Sprintf("The service exceeded its memory limit of %s. This may be caused by other errors.", memoryLimit)
}

// MitigationSteps returns the mitigation steps for MemoryLimitExceededError errors.
func (e *MemoryLimitExceededErrorProvider) MitigationSteps(rawAgentDetail string) string {
	return "If other errors exist, address them first. Otherwise, please reduce the memory allocation for the service, then redeploy. Alternatively, you can choose a machine type with higher resource limits in the Advanced settings under the Infrastructure tab."
}

// Documentation returns the documentation links for MemoryLimitExceededError errors.
func (e *MemoryLimitExceededErrorProvider) Documentation(rawAgentDetail string) []string {
	return []string{
		"https://docs.porter.run/standard/deploying-applications/runtime-configuration-options/web-applications#resources",
	}
}

// CPULimitExceededErrorProvider provides error details for CPULimitExceededError errors.
type CPULimitExceededErrorProvider struct{}

// Detail returns the error detail for CPULimitExceededError errors.
func (e *CPULimitExceededErrorProvider) Detail(rawAgentDetail string) string {
	return "The service exceeded its CPU limit. This may be caused by other errors."
}

// MitigationSteps returns the mitigation steps for CPULimitExceededError errors.
func (e *CPULimitExceededErrorProvider) MitigationSteps(rawAgentDetail string) string {
	return "If other errors exist, address them first. Otherwise, please reduce the CPU allocation for the service, then redeploy. Alternatively, you can choose a machine type with higher resource limits in Infrastructure -> Advanced settings."
}

// Documentation returns the documentation links for CPULimitExceededError errors.
func (e *CPULimitExceededErrorProvider) Documentation(rawAgentDetail string) []string {
	return []string{
		"https://docs.porter.run/standard/deploying-applications/runtime-configuration-options/web-applications#resources",
	}
}
