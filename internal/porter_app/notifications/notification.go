package notifications

import (
	"time"

	"github.com/google/uuid"
)

// Notification is a struct that contains all actionable information from an app event
type Notification struct {
	// AppID is the ID of the app
	AppID string `json:"app_id"`
	// AppName is the name of the app
	AppName string `json:"app_name"`
	// ServiceName is the name of the service
	ServiceName string `json:"service_name"`
	// AppRevisionID is the ID of the app revision that the notification belongs to
	AppRevisionID string `json:"app_revision_id"`
	// AgentEventID is the ID of the agent event, used for deduping
	AgentEventID int `json:"agent_event_id"`
	// AgentDetail is the raw detail of the agent event
	AgentDetail string `json:"agent_detail"`
	// AgentSummary is the raw summary of the agent event
	AgentSummary string `json:"agent_summary"`
	// Error is the Porter error parsed from the agent event
	Error PorterError `json:"error"`
	// Deployment is the deployment metadata, used to determine if the notification occurred during deployment or after
	Deployment Deployment `json:"deployment"`
	// Timestamp is the time that the notification was created
	Timestamp time.Time `json:"timestamp"`
	// ID is the ID of the notification
	ID uuid.UUID `json:"id"`
}

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
