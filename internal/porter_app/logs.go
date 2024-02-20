package porter_app

import (
	"time"

	"github.com/porter-dev/porter/api/types"
)

// StructuredLog represents a single log line with all necessary fields required by Porter API clients
type StructuredLog struct {
	Timestamp          time.Time `json:"timestamp"`
	Line               string    `json:"line"`
	OutputStream       string    `json:"output_stream"`
	ServiceName        string    `json:"service_name"`
	AppRevisionID      string    `json:"app_revision_id"`
	DeploymentTargetID string    `json:"deployment_target_id"`
	AppInstanceID      string    `json:"app_instance_id"`
	JobName            string    `json:"job_name,omitempty"`
	JobRunID           string    `json:"job_run_id,omitempty"`
}

const (
	lokiLabel_PorterAppName       = "porter_run_app_name"
	lokiLabel_PorterAppID         = "porter_run_app_id"
	lokiLabel_PorterServiceName   = "porter_run_service_name"
	lokiLabel_PorterAppRevisionID = "porter_run_app_revision_id"
	lokiLabel_DeploymentTargetId  = "porter_run_deployment_target_id"
	lokiLabel_AppInstanceID			 = "porter_run_app_instance_id"
	lokiLabel_JobRunName          = "job_name"
	lokiLabel_ControllerUID       = "controller_uid"
)

// AgentLogToStructuredLog converts a set of raw logs from the agent to structured logs
func AgentLogToStructuredLog(rawLogs []types.LogLine) []StructuredLog {
	var logs []StructuredLog

	for _, log := range rawLogs {
		structuredLog := StructuredLog{
			Line:         log.Line,
			OutputStream: log.Metadata.OutputStream,
		}

		if log.Timestamp != nil {
			structuredLog.Timestamp = *log.Timestamp
		}
		if serviceName, ok := log.Metadata.RawLabels[lokiLabel_PorterServiceName]; ok {
			structuredLog.ServiceName = serviceName
		}
		if appRevisionID, ok := log.Metadata.RawLabels[lokiLabel_PorterAppRevisionID]; ok {
			structuredLog.AppRevisionID = appRevisionID
		}
		if deploymentTargetID, ok := log.Metadata.RawLabels[lokiLabel_DeploymentTargetId]; ok {
			structuredLog.DeploymentTargetID = deploymentTargetID
		}
		if jobName, ok := log.Metadata.RawLabels[lokiLabel_JobRunName]; ok {
			structuredLog.JobName = jobName
		}
		if jobRunID, ok := log.Metadata.RawLabels[lokiLabel_ControllerUID]; ok {
			structuredLog.JobRunID = jobRunID
		}
		if appInstanceID, ok := log.Metadata.RawLabels[lokiLabel_AppInstanceID]; ok {
			structuredLog.AppInstanceID = appInstanceID
		}

		logs = append(logs, structuredLog)
	}

	return logs
}
