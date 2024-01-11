package datastore

import (
	"context"
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/cloud_provider"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListDatastoresRequest is a struct that represents the various filter options used for
// retrieving the datastores
type ListDatastoresRequest struct {
	// Name is the name of the datastore to filter by
	Name string `schema:"name"`

	// Type is the type of the datastore to filter by
	Type string `schema:"type"`

	// IncludeEnvGroup controls whether to include the datastore env group or not
	IncludeEnvGroup bool `schema:"include_env_group"`

	// IncludeMetadata controls whether to include datastore metadata or not
	IncludeMetadata bool `schema:"include_metadata"`
}

// ListDatastoresResponse describes the list datastores response body
type ListDatastoresResponse struct {
	// Datastores is a list of datastore entries for the http response
	Datastores []Datastore `json:"datastores"`
}

// Datastore describes an outbound datastores response entry
type Datastore struct {
	// Name is the name of the datastore
	Name string `json:"name"`

	// Type is the type of the datastore
	Type string `json:"type"`

	// Env is the env group for the datastore
	Env *porterv1.EnvGroup `json:"env,omitempty"`

	// Metadata is a list of metadata objects for the datastore
	Metadata []*porterv1.DatastoreMetadata `json:"metadata,omitempty"`

	// Status is the status of the datastore
	Status string `json:"status,omitempty"`
}

// ListDatastoresHandler is a struct for handling list datastores requests
type ListDatastoresHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewListDatastoresHandler constructs a datastore ListDatastoresHandler
func NewListDatastoresHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListDatastoresHandler {
	return &ListDatastoresHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServeHTTP returns a list of datastores associated with the specified project/cloud-provider
func (h *ListDatastoresHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-datastore-list")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &ListDatastoresRequest{}
	if ok := h.DecodeAndValidate(w, r, request); !ok {
		return
	}

	cloudProviderType, reqErr := requestutils.GetURLParamString(r, types.URLParamCloudProviderType)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error parsing cloud provider type")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cloud-provider-type", Value: cloudProviderType})

	cloudProviderID, reqErr := requestutils.GetURLParamString(r, types.URLParamCloudProviderID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error parsing cloud provider id")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cloud-provider-id", Value: cloudProviderID})

	datastoreType := porterv1.EnumDatastore_ENUM_DATASTORE_UNSPECIFIED
	switch request.Type {
	case "elasticache-redis":
		datastoreType = porterv1.EnumDatastore_ENUM_DATASTORE_ELASTICACHE_REDIS
	case "rds-postgresql":
		datastoreType = porterv1.EnumDatastore_ENUM_DATASTORE_RDS_POSTGRESQL
	case "rds-postgresql-aurora":
		datastoreType = porterv1.EnumDatastore_ENUM_DATASTORE_RDS_AURORA_POSTGRESQL
	case "":
		datastoreType = porterv1.EnumDatastore_ENUM_DATASTORE_UNSPECIFIED
	default:
		err := telemetry.Error(ctx, span, nil, "invalid datastore type specified")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	var cloudProvider porterv1.EnumCloudProvider
	switch cloudProviderType {
	case "aws":
		cloudProvider = porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS
	default:
		err := telemetry.Error(ctx, span, nil, "unsupported cloud provider")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "datastore-name", Value: request.Name},
		telemetry.AttributeKV{Key: "datastore-type", Value: request.Type},
		telemetry.AttributeKV{Key: "include-env-group", Value: request.IncludeEnvGroup},
		telemetry.AttributeKV{Key: "include-metadata", Value: request.IncludeMetadata},
		telemetry.AttributeKV{Key: "cloud-provider-type", Value: int(cloudProvider)},
		telemetry.AttributeKV{Key: "cloud-provider-id", Value: cloudProviderID},
	)

	response := ListDatastoresResponse{
		Datastores: []Datastore{},
	}

	datastores, err := Datastores(ctx, DatastoresInput{
		ProjectID:       project.ID,
		Name:            request.Name,
		Type:            datastoreType,
		IncludeEnvGroup: request.IncludeEnvGroup,
		IncludeMetadata: request.IncludeMetadata,
		CloudProvider: cloud_provider.CloudProvider{
			Type:      cloudProvider,
			AccountID: cloudProviderID,
		},
		CCPClient: h.Config().ClusterControlPlaneClient,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing datastores")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response.Datastores = datastores

	h.WriteResult(w, r, response)
}

// DatastoresInput is the input to the Datastores function
type DatastoresInput struct {
	ProjectID       uint
	CloudProvider   cloud_provider.CloudProvider
	Name            string
	Type            porterv1.EnumDatastore
	IncludeEnvGroup bool
	IncludeMetadata bool

	CCPClient porterv1connect.ClusterControlPlaneServiceClient
}

// Datastores returns a list of datastores associated with the specified project/cloud-provider
func Datastores(ctx context.Context, inp DatastoresInput) ([]Datastore, error) {
	ctx, span := telemetry.NewSpan(ctx, "datastores-for-cloud-provider")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "datastore-name", Value: inp.Name},
		telemetry.AttributeKV{Key: "datastore-type", Value: int(inp.Type)},
		telemetry.AttributeKV{Key: "include-env-group", Value: inp.IncludeEnvGroup},
		telemetry.AttributeKV{Key: "include-metadata", Value: inp.IncludeMetadata},
		telemetry.AttributeKV{Key: "cloud-provider-type", Value: int(inp.CloudProvider.Type)},
		telemetry.AttributeKV{Key: "cloud-provider-id", Value: inp.CloudProvider.AccountID},
		telemetry.AttributeKV{Key: "project-id", Value: inp.ProjectID},
	)

	datastores := []Datastore{}

	if inp.ProjectID == 0 {
		return datastores, telemetry.Error(ctx, span, nil, "project id must be specified")
	}
	if inp.CloudProvider.Type == porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_UNSPECIFIED {
		return datastores, telemetry.Error(ctx, span, nil, "cloud provider type must be specified")
	}
	if inp.CloudProvider.AccountID == "" {
		return datastores, telemetry.Error(ctx, span, nil, "cloud provider account id must be specified")
	}

	message := porterv1.ListDatastoresRequest{
		ProjectId:              int64(inp.ProjectID),
		CloudProvider:          inp.CloudProvider.Type,
		CloudProviderAccountId: inp.CloudProvider.AccountID,
		Name:                   inp.Name,
		IncludeEnvGroup:        inp.IncludeEnvGroup,
		IncludeMetadata:        inp.IncludeMetadata,
	}
	if inp.Type != porterv1.EnumDatastore_ENUM_DATASTORE_UNSPECIFIED {
		message.Type = &inp.Type
	}
	req := connect.NewRequest(&message)
	resp, ccpErr := inp.CCPClient.ListDatastores(ctx, req)
	if ccpErr != nil {
		return datastores, telemetry.Error(ctx, span, ccpErr, "error listing datastores from ccp")
	}
	if resp.Msg == nil {
		return datastores, telemetry.Error(ctx, span, nil, "missing response message from ccp")
	}

	for _, datastore := range resp.Msg.Datastores {
		datastores = append(datastores, Datastore{
			Name:     datastore.Name,
			Type:     datastore.Type.Enum().String(),
			Metadata: datastore.Metadata,
			Env:      datastore.Env,
		})
	}

	return datastores, nil
}
