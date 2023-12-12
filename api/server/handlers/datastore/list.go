package datastore

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListRequest is a struct that represents the various filter options used for
// retrieving the datastores
type ListRequest struct {
	// Name is the name of the datastore to filter by
	Name string `schema:"name"`

	// Type is the type of the datastore to filter by
	Type string `schema:"type"`

	// IncludeEnvGroup controls whether to include the datastore env group or not
	IncludeEnvGroup bool `schema:"include_env_group"`

	// IncludeMetadata controls whether to include datastore metadata or not
	IncludeMetadata bool `schema:"include_metadata"`
}

// ListResponseEntry describes an outbound datastores response entry
type ListResponseEntry struct {
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

// ListHandler is a struct for handling datastore status requests
type ListHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewListHandler constructs a datastore ListHandler
func NewListHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListHandler {
	return &ListHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (h *ListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-datastore-list")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &ListRequest{}
	if ok := h.DecodeAndValidate(w, r, request); !ok {
		return
	}

	cloudProviderType, err := requestutils.GetURLParamString(r, types.URLParamCloudProviderType)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing cloud provider type")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cloud-provider-type", Value: cloudProviderType})

	cloudProviderID, err := requestutils.GetURLParamString(r, types.URLParamCloudProviderID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing cloud provider id")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cloud-provider-id", Value: cloudProviderID})

	datastoreType := porterv1.EnumDatastore_ENUM_DATASTORE_UNSPECIFIED
	if request.Type != "" {
		switch request.Type {
		case "elasticache-redis":
			datastoreType = porterv1.EnumDatastore_ENUM_DATASTORE_ELASTICACHE_REDIS
		case "rds-postgresql":
			datastoreType = porterv1.EnumDatastore_ENUM_DATASTORE_RDS_POSTGRESQL
		case "rds-postgresql-aurora":
			datastoreType = porterv1.EnumDatastore_ENUM_DATASTORE_RDS_AURORA_POSTGRESQL
		default:
			err := telemetry.Error(ctx, span, err, "invalid datastore type specified")
			h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "datastore-name", Value: request.Name},
		telemetry.AttributeKV{Key: "datastore-type", Value: request.Type},
		telemetry.AttributeKV{Key: "include-env-group", Value: request.IncludeEnvGroup},
		telemetry.AttributeKV{Key: "include-metadata", Value: request.IncludeMetadata},
	)

	switch cloudProviderType {
	case "aws":
		message := porterv1.ListDatastoresRequest{
			ProjectId:              int64(project.ID),
			CloudProvider:          porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS,
			CloudProviderAccountId: cloudProviderID,
			Name:                   request.Name,
			IncludeEnvGroup:        request.IncludeEnvGroup,
			IncludeMetadata:        request.IncludeMetadata,
		}
		if datastoreType != porterv1.EnumDatastore_ENUM_DATASTORE_UNSPECIFIED {
			message.Type = &datastoreType
		}
		req := connect.NewRequest(&message)
		resp, err := h.Config().ClusterControlPlaneClient.ListDatastores(ctx, req)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error listing datastores from ccp")
			h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		if resp.Msg == nil {
			err := telemetry.Error(ctx, span, err, "missing response message from ccp")
			h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		response := []ListResponseEntry{}
		for _, datastore := range resp.Msg.Datastores {
			response = append(response, ListResponseEntry{
				Name:     datastore.Name,
				Type:     datastore.Type.Enum().String(),
				Metadata: datastore.Metadata,
				Env:      datastore.Env,
			})
		}

		h.WriteResult(w, r, response)
	default:
		err := telemetry.Error(ctx, span, nil, "unsupported cloud provider")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
}
