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

// ListAllDatastoresForProjectHandler is a struct for listing all datastores for a given project
type ListAllDatastoresForProjectHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewListAllDatastoresForProjectHandler constructs a datastore ListAllDatastoresForProjectHandler
func NewListAllDatastoresForProjectHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListAllDatastoresForProjectHandler {
	return &ListAllDatastoresForProjectHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServeHTTP returns a list of datastores associated with the specified project
func (h *ListAllDatastoresForProjectHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-all-datastores-for-project")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	// TODO: replace everything below with a single ccp call.
	// Currently we are required to retrieve and send account ids to ccp because of the way the ccp endpoint is implemented,
	// but we should really just send a project id and let ccp do the rest.
	cloudProviders, err := cloud_provider.AwsAccounts(ctx, cloud_provider.AwsAccountsInput{
		ProjectID:                    project.ID,
		AWSAssumeRoleChainRepository: h.Repo().AWSAssumeRoleChainer(),
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting cloud providers")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "num-cloud-providers", Value: len(cloudProviders)})

	allDatastores := []Datastore{}

	for _, cloudProvider := range cloudProviders {
		datastoresForCloudProvider, err := Datastores(ctx, DatastoresInput{
			ProjectID:       project.ID,
			CloudProvider:   cloudProvider,
			IncludeMetadata: true,
			CCPClient:       h.Config().ClusterControlPlaneClient,
		})
		if err != nil {
			telemetry.WithAttributes(span,
				telemetry.AttributeKV{Key: "cloud-provider-id", Value: cloudProvider.AccountID},
				telemetry.AttributeKV{Key: "cloud-provider-type", Value: int(cloudProvider.Type)},
			)
			err := telemetry.Error(ctx, span, err, "error getting datastores")
			h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		allDatastores = append(allDatastores, datastoresForCloudProvider...)
	}

	response := ListDatastoresResponse{
		Datastores: allDatastores,
	}

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
