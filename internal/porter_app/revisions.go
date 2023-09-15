package porter_app

import (
	"context"
	"encoding/base64"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"
	"github.com/porter-dev/porter/internal/telemetry"
)

// Revision represents the data for a single revision
type Revision struct {
	// ID is the revision id
	ID string `json:"id"`
	// B64AppProto is the base64 encoded app proto definition
	B64AppProto string `json:"b64_app_proto"`
	// Status is the status of the revision
	Status string `json:"status"`
	// RevisionNumber is the revision number with respect to the app and deployment target
	RevisionNumber uint64 `json:"revision_number"`
	// CreatedAt is the time the revision was created
	CreatedAt time.Time `json:"created_at"`
	// UpdatedAt is the time the revision was updated
	UpdatedAt time.Time `json:"updated_at"`
}

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

	revision = Revision{
		B64AppProto:    b64,
		Status:         appRevision.Status,
		ID:             appRevision.Id,
		RevisionNumber: appRevision.RevisionNumber,
		CreatedAt:      appRevision.CreatedAt.AsTime(),
		UpdatedAt:      appRevision.UpdatedAt.AsTime(),
	}

	return revision, nil
}
