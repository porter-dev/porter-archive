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
	// AppRevisionID is the ID of the app revision that the notification belongs to
	AppRevisionID string `json:"app_revision_id"`
	// Error is the Porter error parsed from the agent event
	Error PorterError `json:"error"`
	// Timestamp is the time that the notification was created
	Timestamp time.Time `json:"timestamp"`
	// ID is the ID of the notification
	ID uuid.UUID `json:"id"`
	// Scope is the scope of the notification
	Scope Scope `json:"scope"`
	// Metadata is the metadata of the notification
	Metadata Metadata `json:"metadata"`
}

// Metadata is the metadata of the notification
type Metadata struct {
	// Deployment is the deployment metadata, used to determine if the notification occurred during deployment or after
	Deployment Deployment `json:"deployment,omitempty"`
	// ServiceName is the name of the service
	ServiceName string `json:"service_name,omitempty"`
	// JobRunID is the id of the job run, if the service is a job
	JobRunID string `json:"job_run_id,omitempty"`
}

// Scope is the scope of the notification
type Scope string

const (
	// Scope_Application indicates that the notification is scoped to the application
	Scope_Application Scope = "APPLICATION"
	// Scope_Revision indicates that the notification is scoped to the revision
	Scope_Revision Scope = "REVISION"
	// Scope_Service indicates that the notification is scoped to the service
	Scope_Service Scope = "SERVICE"
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
