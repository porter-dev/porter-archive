package porter_app

import (
	"context"
	"encoding/base64"
	"fmt"
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
	DeploymentTargetID string `json:"deployment_target_id"`
	// Env is the environment variables for the revision
	Env environment_groups.EnvironmentGroup `json:"env,omitempty"`
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
	if err != nil {
		return revision, telemetry.Error(ctx, span, err, "error getting app revision status from proto")
	}

	revision = Revision{
		B64AppProto:        b64,
		Status:             status,
		ID:                 appRevision.Id,
		RevisionNumber:     appRevision.RevisionNumber,
		CreatedAt:          appRevision.CreatedAt.AsTime(),
		UpdatedAt:          appRevision.UpdatedAt.AsTime(),
		DeploymentTargetID: appRevision.DeploymentTargetId,
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

	envName, err := AppEnvGroupName(ctx, appDef.Name, inp.Revision.DeploymentTargetID, uint(inp.ClusterID), inp.PorterAppRepository)
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
	var appRevisionStatus models.AppRevisionStatus
	switch status {
	case string(models.AppRevisionStatus_ImageAvailable):
		appRevisionStatus = models.AppRevisionStatus_ImageAvailable
	case string(models.AppRevisionStatus_AwaitingBuild):
		appRevisionStatus = models.AppRevisionStatus_AwaitingBuild
	case string(models.AppRevisionStatus_AwaitingPredeploy):
		appRevisionStatus = models.AppRevisionStatus_AwaitingPredeploy
	case string(models.AppRevisionStatus_Deployed):
		appRevisionStatus = models.AppRevisionStatus_Deployed
	case string(models.AppRevisionStatus_Deploying):
		appRevisionStatus = models.AppRevisionStatus_Deploying
	case string(models.AppRevisionStatus_AwaitingDeploy):
		appRevisionStatus = models.AppRevisionStatus_AwaitingDeploy
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
	case string(models.AppRevisionStatus_DeployFailed):
		appRevisionStatus = models.AppRevisionStatus_DeployFailed
	case string(models.AppRevisionStatus_Created):
		appRevisionStatus = models.AppRevisionStatus_Created
	case string(models.AppRevisionStatus_BuildSuccessful):
		appRevisionStatus = models.AppRevisionStatus_BuildSuccessful
	case string(models.AppRevisionStatus_ApplyFailed):
		appRevisionStatus = models.AppRevisionStatus_ApplyFailed

	default:
		return appRevisionStatus, fmt.Errorf("unknown app revision status")
	}

	return appRevisionStatus, nil
}
