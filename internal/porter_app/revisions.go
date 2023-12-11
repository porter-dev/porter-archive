package porter_app

import (
	"context"
	"encoding/base64"
	"errors"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"
	"github.com/porter-dev/porter/internal/deployment_target"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/environment_groups"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

// Revision represents the data for a single revision
type Revision struct {
	// ID is the revision id
	ID string `json:"id"`
	// B64AppProto is the base64 encoded app proto definition
	B64AppProto string `json:"b64_app_proto"`
	// Status is the status of the revision
	Status models.AppRevisionStatus `json:"status"`
	// RevisionNumber is the revision number with respect to the app and deployment target
	RevisionNumber uint64 `json:"revision_number"`
	// CreatedAt is the time the revision was created
	CreatedAt time.Time `json:"created_at"`
	// UpdatedAt is the time the revision was updated
	UpdatedAt time.Time `json:"updated_at"`
	// DeploymentTargetID is the id of the deployment target the revision is associated with
	DeploymentTarget DeploymentTarget `json:"deployment_target"`
	// Env is the environment variables for the revision
	Env environment_groups.EnvironmentGroup `json:"env,omitempty"`
	// AppInstanceID is the id of the app instance the revision is associated with
	AppInstanceID uuid.UUID `json:"app_instance_id"`
}

// RevisionStatus describes the status of a revision
type RevisionStatus struct {
	// PredeployStarted is true if the predeploy process has started
	PredeployStarted bool `json:"predeploy_started"`
	// PredeploySuccessful is true if the predeploy process has completed successfully
	PredeploySuccessful bool `json:"predeploy_successful"`
	// PredeployFailed is true if the predeploy process has failed
	PredeployFailed bool `json:"predeploy_failed"`
	// InstallStarted is true if the install process has started
	InstallStarted bool `json:"install_started"`
	// InstallSuccessful is true if the install process has completed successfully
	InstallSuccessful bool `json:"install_successful"`
	// InstallFailed is true if the install process has failed
	InstallFailed bool `json:"install_failed"`
	// DeploymentStarted is true if the deployment process has started
	DeploymentStarted bool `json:"deployment_started"`
	// DeploymentSuccessful is true if the deployment process has completed successfully
	DeploymentSuccessful bool `json:"deployment_successful"`
	// DeploymentFailed is true if the deployment process has failed
	DeploymentFailed bool `json:"deployment_failed"`
	// IsInTerminalStatus is true if the revision is in a terminal status
	IsInTerminalStatus bool `json:"is_in_terminal_status"`
}

// DeploymentTarget is a simplified version of the deployment target struct
type DeploymentTarget struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// GetAppRevisionInput is the input struct for GetAppRevisions
type GetAppRevisionInput struct {
	ProjectID     uint
	AppRevisionID uuid.UUID

	CCPClient porterv1connect.ClusterControlPlaneServiceClient
}

// GetAppRevision returns a single app revision by id
func GetAppRevision(ctx context.Context, inp GetAppRevisionInput) (Revision, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-app-revision")
	defer span.End()

	var revision Revision

	if inp.ProjectID == 0 {
		return revision, telemetry.Error(ctx, span, nil, "must provide a project id")
	}
	if inp.AppRevisionID == uuid.Nil {
		return revision, telemetry.Error(ctx, span, nil, "must provide an app revision id")
	}

	getRevisionReq := connect.NewRequest(&porterv1.GetAppRevisionRequest{
		ProjectId:     int64(inp.ProjectID),
		AppRevisionId: inp.AppRevisionID.String(),
	})

	ccpResp, err := inp.CCPClient.GetAppRevision(ctx, getRevisionReq)
	if err != nil {
		return revision, telemetry.Error(ctx, span, err, "error getting app revision")
	}
	if ccpResp == nil || ccpResp.Msg == nil {
		return revision, telemetry.Error(ctx, span, nil, "get app revision response is nil")
	}

	appRevisionProto := ccpResp.Msg.AppRevision

	revision, err = EncodedRevisionFromProto(ctx, appRevisionProto)
	if err != nil {
		return revision, telemetry.Error(ctx, span, err, "error converting app revision from proto")
	}

	return revision, nil
}

// EncodedRevisionFromProto converts an AppRevision proto object into a Revision object
func EncodedRevisionFromProto(ctx context.Context, appRevision *porterv1.AppRevision) (Revision, error) {
	ctx, span := telemetry.NewSpan(ctx, "encoded-revision-from-proto")
	defer span.End()

	var revision Revision

	if appRevision == nil {
		return revision, telemetry.Error(ctx, span, nil, "current app revision definition is nil")
	}

	appProto := appRevision.App
	if appProto == nil {
		return revision, telemetry.Error(ctx, span, nil, "app proto is nil")
	}

	encoded, err := helpers.MarshalContractObject(ctx, appProto)
	if err != nil {
		return revision, telemetry.Error(ctx, span, err, "error marshalling app proto back to json")
	}

	b64 := base64.StdEncoding.EncodeToString(encoded)

	status, err := appRevisionStatusFromProto(appRevision.Status)
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "status", Value: string(status)})
	if err != nil {
		_ = telemetry.Error(ctx, span, nil, "unknown revision type") // flagged as an error for visibility
	}

	appInstanceIdStr := appRevision.AppInstanceId
	appInstanceId, err := uuid.Parse(appInstanceIdStr)
	if err != nil {
		return revision, telemetry.Error(ctx, span, err, "error parsing app instance id")
	}

	revision = Revision{
		B64AppProto:      b64,
		Status:           status,
		ID:               appRevision.Id,
		RevisionNumber:   appRevision.RevisionNumber,
		CreatedAt:        appRevision.CreatedAt.AsTime(),
		UpdatedAt:        appRevision.UpdatedAt.AsTime(),
		DeploymentTarget: DeploymentTarget{ID: appRevision.DeploymentTargetId},
		AppInstanceID:    appInstanceId,
	}

	return revision, nil
}

// AttachEnvToRevisionInput is the input struct for AttachEnvToRevision
type AttachEnvToRevisionInput struct {
	ProjectID           uint
	ClusterID           int
	Revision            Revision
	DeploymentTarget    deployment_target.DeploymentTarget
	K8SAgent            *kubernetes.Agent
	PorterAppRepository repository.PorterAppRepository
}

// AttachEnvToRevision attaches the environment variables from the app's default env group to a revision
// These are the variables that are displayed to the user in the UI as associated with the app rather than an env group
func AttachEnvToRevision(ctx context.Context, inp AttachEnvToRevisionInput) (Revision, error) {
	ctx, span := telemetry.NewSpan(ctx, "attach-env-to-revision")
	defer span.End()

	revision := inp.Revision

	if inp.ProjectID == 0 {
		return revision, telemetry.Error(ctx, span, nil, "must provide a project id")
	}
	if inp.ClusterID == 0 {
		return revision, telemetry.Error(ctx, span, nil, "must provide a cluster id")
	}
	if inp.K8SAgent == nil {
		return revision, telemetry.Error(ctx, span, nil, "k8s agent is nil")
	}

	decoded, err := base64.StdEncoding.DecodeString(revision.B64AppProto)
	if err != nil {
		return revision, telemetry.Error(ctx, span, err, "error decoding app proto")
	}

	appDef := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, appDef)
	if err != nil {
		return revision, telemetry.Error(ctx, span, err, "error unmarshalling app proto")
	}

	envName, err := AppEnvGroupName(ctx, appDef.Name, inp.Revision.DeploymentTarget.ID, uint(inp.ClusterID), inp.PorterAppRepository)
	if err != nil {
		return revision, telemetry.Error(ctx, span, err, "error getting app env group name")
	}
	envNameFilter := []string{envName}

	envFromProtoInp := AppEnvironmentFromProtoInput{
		ProjectID:        inp.ProjectID,
		ClusterID:        inp.ClusterID,
		App:              appDef,
		K8SAgent:         inp.K8SAgent,
		DeploymentTarget: inp.DeploymentTarget,
	}
	envGroups, err := AppEnvironmentFromProto(ctx, envFromProtoInp, WithEnvGroupFilter(envNameFilter), WithSecrets())
	if err != nil {
		return revision, telemetry.Error(ctx, span, err, "error getting app environment from revision")
	}

	if len(envGroups) > 1 {
		return revision, telemetry.Error(ctx, span, err, "multiple app envs groups returned for same name")
	}
	if len(envGroups) == 1 {
		revision.Env = envGroups[0]
	}

	return revision, nil
}

func appRevisionStatusFromProto(status string) (models.AppRevisionStatus, error) {
	appRevisionStatus := models.AppRevisionStatus_Unknown
	switch status {
	case string(models.AppRevisionStatus_ImageAvailable):
		appRevisionStatus = models.AppRevisionStatus_ImageAvailable
	case string(models.AppRevisionStatus_AwaitingBuild):
		appRevisionStatus = models.AppRevisionStatus_AwaitingBuild
	case string(models.AppRevisionStatus_AwaitingPredeploy):
		appRevisionStatus = models.AppRevisionStatus_AwaitingPredeploy
	case string(models.AppRevisionStatus_InstallSuccessful):
		appRevisionStatus = models.AppRevisionStatus_InstallSuccessful
	case string(models.AppRevisionStatus_InstallProgressing):
		appRevisionStatus = models.AppRevisionStatus_InstallProgressing
	case string(models.AppRevisionStatus_AwaitingInstall):
		appRevisionStatus = models.AppRevisionStatus_AwaitingInstall
	case string(models.AppRevisionStatus_BuildCanceled):
		appRevisionStatus = models.AppRevisionStatus_BuildCanceled
	case string(models.AppRevisionStatus_BuildFailed):
		appRevisionStatus = models.AppRevisionStatus_BuildFailed
	case string(models.AppRevisionStatus_PredeployFailed):
		appRevisionStatus = models.AppRevisionStatus_PredeployFailed
	case string(models.AppRevisionStatus_PredeploySuccessful):
		appRevisionStatus = models.AppRevisionStatus_PredeploySuccessful
	case string(models.AppRevisionStatus_PredeployProgressing):
		appRevisionStatus = models.AppRevisionStatus_PredeployProgressing
	case string(models.AppRevisionStatus_InstallFailed):
		appRevisionStatus = models.AppRevisionStatus_InstallFailed
	case string(models.AppRevisionStatus_Created):
		appRevisionStatus = models.AppRevisionStatus_Created
	case string(models.AppRevisionStatus_BuildSuccessful):
		appRevisionStatus = models.AppRevisionStatus_BuildSuccessful
	case string(models.AppRevisionStatus_ApplyFailed):
		appRevisionStatus = models.AppRevisionStatus_ApplyFailed
	case string(models.AppRevisionStatus_UpdateFailed):
		appRevisionStatus = models.AppRevisionStatus_UpdateFailed
	case string(models.AppRevisionStatus_DeploymentProgressing):
		appRevisionStatus = models.AppRevisionStatus_DeploymentProgressing
	case string(models.AppRevisionStatus_DeploymentSuccessful):
		appRevisionStatus = models.AppRevisionStatus_DeploymentSuccessful
	case string(models.AppRevisionStatus_DeploymentFailed):
		appRevisionStatus = models.AppRevisionStatus_DeploymentFailed
	default:
		return appRevisionStatus, errors.New("unknown app revision status")
	}

	return appRevisionStatus, nil
}
