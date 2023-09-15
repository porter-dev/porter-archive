package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AppRevisionStatus is the status of an app revision
type AppRevisionStatus string

const (
	// AppRevisionStatus_Created is the initial status for a revision when first inserted in database
	AppRevisionStatus_Created AppRevisionStatus = "CREATED"
	// AppRevisionStatus_AwaitingBuild is the status for a revision that still needs to be built
	AppRevisionStatus_AwaitingBuild AppRevisionStatus = "AWAITING_BUILD_ARTIFACT"
	// AppRevisionStatus_AwaitingPredeploy is the status for a revision that is waiting for a predeploy to complete.
	AppRevisionStatus_AwaitingPredeploy AppRevisionStatus = "AWAITING_PREDEPLOY"
	// AppRevisionStatus_Deployed is the status for a revision that has been deployed
	AppRevisionStatus_Deployed AppRevisionStatus = "DEPLOYED"

	// AppRevisionStatus_BuildCanceled is the status for a revision that was canceled during the build process
	AppRevisionStatus_BuildCanceled AppRevisionStatus = "BUILD_CANCELED"
	// AppRevisionStatus_BuildFailed is the status for a revision that failed to build
	AppRevisionStatus_BuildFailed AppRevisionStatus = "BUILD_FAILED"
	// AppRevisionStatus_PredeployFailed is the status for a revision that failed to predeploy
	AppRevisionStatus_PredeployFailed AppRevisionStatus = "PREDEPLOY_FAILED"
	// AppRevisionStatus_DeployFailed is the status for a revision that failed to deploy
	AppRevisionStatus_DeployFailed AppRevisionStatus = "DEPLOY_FAILED"
)

// AppRevision represents the full spec for a revision of a porter app
type AppRevision struct {
	gorm.Model

	// ID is a UUID for the AppRevision
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// Base64App is the PorterApp as json encoded in base64
	Base64App string `json:"base64_app"`

	// Status is the status of the apply that happened for this revision.
	Status AppRevisionStatus `json:"status"`

	// DeploymentTargetID is the ID of the deployment target that the revision applies to.
	DeploymentTargetID uuid.UUID `json:"deployment_target_id"`

	// ProjectID is the ID of the project that the revision belongs to.
	ProjectID int `json:"project_id"`

	// PorterAppID is the ID of the PorterApp that the revision belongs to.
	PorterAppID int `json:"porter_app_id"`

	// RevisionNumber is the number of the revision respective to that porter_app_id and deployment_target_id
	RevisionNumber int `json:"revision_number"`
}
