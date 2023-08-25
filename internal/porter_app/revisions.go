package porter_app

import (
	"context"
	"encoding/base64"
	"time"

	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/telemetry"
)

// Revision represents the data for a single revision
type Revision struct {
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
		RevisionNumber: appRevision.RevisionNumber,
		CreatedAt:      appRevision.CreatedAt.AsTime(),
		UpdatedAt:      appRevision.UpdatedAt.AsTime(),
	}

	return revision, nil
}
