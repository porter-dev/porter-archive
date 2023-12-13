package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AppRevisionStatus is the status of an app revision
type AppRevisionStatus string

const (
	// AppRevisionStatus_Unknown is the default status for an app revision
	AppRevisionStatus_Unknown AppRevisionStatus = "UNKNOWN"
	// AppRevisionStatus_Created is the initial status for a revision when first inserted in database
	AppRevisionStatus_Created AppRevisionStatus = "CREATED"
	// AppRevisionStatus_ImageAvailable is the status for a revision that has an image available
	AppRevisionStatus_ImageAvailable AppRevisionStatus = "IMAGE_AVAILABLE"
	// AppRevisionStatus_AwaitingBuild is the status for a revision that still needs to be built
	AppRevisionStatus_AwaitingBuild AppRevisionStatus = "AWAITING_BUILD_ARTIFACT"
	// AppRevisionStatus_BuildCanceled is the status for a revision that was canceled during the build process
	AppRevisionStatus_BuildCanceled AppRevisionStatus = "BUILD_CANCELED"
	// AppRevisionStatus_BuildFailed is the status for a revision that failed to build
	AppRevisionStatus_BuildFailed AppRevisionStatus = "BUILD_FAILED"
	// AppRevisionStatus_BuildSuccessful is the status for a revision that successfully built
	AppRevisionStatus_BuildSuccessful AppRevisionStatus = "BUILD_SUCCESSFUL"
	// AppRevisionStatus_AwaitingPredeploy is the status for a revision that is waiting for a predeploy to be run
	AppRevisionStatus_AwaitingPredeploy AppRevisionStatus = "AWAITING_PREDEPLOY"
	// AppRevisionStatus_PredeployProgressing is the status for a revision that is currently running a predeploy
	AppRevisionStatus_PredeployProgressing AppRevisionStatus = "PREDEPLOY_PROGRESSING"
	// AppRevisionStatus_PredeployFailed is the status for a revision that failed to predeploy
	AppRevisionStatus_PredeployFailed AppRevisionStatus = "PREDEPLOY_FAILED"
	// AppRevisionStatus_PredeploySuccessful is the status for a revision that successfully ran a predeploy
	AppRevisionStatus_PredeploySuccessful AppRevisionStatus = "PREDEPLOY_SUCCESSFUL"
	// AppRevisionStatus_AwaitingInstall is the status for a revision that is waiting to be installed
	AppRevisionStatus_AwaitingInstall AppRevisionStatus = "AWAITING_DEPLOY"
	// AppRevisionStatus_InstallProgressing is the status for a revision that is currently installing
	AppRevisionStatus_InstallProgressing AppRevisionStatus = "DEPLOYING"
	// AppRevisionStatus_InstallSuccessful is the status for a revision that has been installed
	AppRevisionStatus_InstallSuccessful AppRevisionStatus = "DEPLOYED"
	// AppRevisionStatus_InstallFailed is the status for a revision that failed to install
	AppRevisionStatus_InstallFailed AppRevisionStatus = "DEPLOY_FAILED"
	// AppRevisionStatus_DeploymentProgressing is the status for a revision that is currently deploying
	AppRevisionStatus_DeploymentProgressing AppRevisionStatus = "DEPLOYMENT_PROGRESSING"
	// AppRevisionStatus_DeploymentSuccessful is the status for a revision that successfully deployed
	AppRevisionStatus_DeploymentSuccessful AppRevisionStatus = "DEPLOYMENT_SUCCESSFUL"
	// AppRevisionStatus_DeploymentFailed is the status for a revision that failed to deploy
	AppRevisionStatus_DeploymentFailed AppRevisionStatus = "DEPLOYMENT_FAILED"
	// AppRevisionStatus_RollbackSuccessful is the status for a revision that successfully rolled back
	AppRevisionStatus_RollbackSuccessful AppRevisionStatus = "ROLLBACK_SUCCESSFUL"
	// AppRevisionStatus_RollbackFailed is the status for a revision that failed to rollback
	AppRevisionStatus_RollbackFailed AppRevisionStatus = "ROLLBACK_FAILED"
	// AppRevisionStatus_ApplyFailed is the status for a revision that failed due to an internal system error
	AppRevisionStatus_ApplyFailed AppRevisionStatus = "APPLY_FAILED"
	// AppRevisionStatus_UpdateFailed is the status for a revision that failed due to an internal system error
	AppRevisionStatus_UpdateFailed AppRevisionStatus = "UPDATE_FAILED"
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

	// PorterAppID is the ID of the PorterApp that the revision belongs to. This will be deprecated in favor of AppInstanceID (tracking: POR-1992)
	PorterAppID int `json:"porter_app_id"`

	// RevisionNumber is the number of the revision respective to that porter_app_id and deployment_target_id
	RevisionNumber int `json:"revision_number"`

	// AppInstanceID is the ID of the AppInstance that the revision belongs to. This will be null while the app instance table is being seeded (tracking: POR-1991)
	AppInstanceID uuid.UUID `json:"app_instance_id" gorm:"type:uuid;default:00000000-0000-0000-0000-000000000000"`
}
