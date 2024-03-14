package datastore

import (
	"context"
	"encoding/base64"
	"net/http"

	"connectrpc.com/connect"
	"github.com/aws/aws-sdk-go/aws/arn"
	"github.com/google/uuid"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/cloud_provider"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/datastore"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// GetDatastoreResponse describes the list datastores response body
type GetDatastoreResponse struct {
	// Datastore is the datastore that has been retrieved
	Datastore datastore.Datastore `json:"datastore"`
}

// GetDatastoreHandler is a struct for retrieving a datastore
type GetDatastoreHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewGetDatastoreHandler returns a GetDatastoreHandler
func NewGetDatastoreHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetDatastoreHandler {
	return &GetDatastoreHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

const (
	// SupportedDatastoreCloudProvider_AWS is the AWS cloud provider
	SupportedDatastoreCloudProvider_AWS string = "AWS"
)

// ServeHTTP retrieves the datastore in the given project
func (c *GetDatastoreHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-datastore")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	resp := GetDatastoreResponse{}

	datastoreName, reqErr := requestutils.GetURLParamString(r, types.URLParamDatastoreName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing datastore name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "datastore-name", Value: datastoreName})

	datastoreRecord, err := c.Repo().Datastore().GetByProjectIDAndName(ctx, project.ID, datastoreName)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "datastore record not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if datastoreRecord == nil || datastoreRecord.ID == uuid.Nil {
		err = telemetry.Error(ctx, span, nil, "datastore record does not exist")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
		return
	}

	// TODO: delete this branch once all datastores are on the management cluster
	if !datastoreRecord.OnManagementCluster {
		awsArn, err := arn.Parse(datastoreRecord.CloudProviderCredentialIdentifier)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error parsing aws account id")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		datastore, err := c.LEGACY_handleGetDatastore(ctx, project.ID, awsArn.AccountID, datastoreName)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error retrieving datastore")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		resp.Datastore = datastore
		c.WriteResult(w, r, resp)
		return
	}

	req := connect.NewRequest(&porterv1.ReadCloudContractRequest{
		ProjectId: int64(project.ID),
	})
	ccpResp, err := c.Config().ClusterControlPlaneClient.ReadCloudContract(ctx, req)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting cloud contract")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "cloud contract not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
		return
	}

	cloudContract := ccpResp.Msg.CloudContract
	if cloudContract == nil {
		err = telemetry.Error(ctx, span, nil, "cloud contract is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
		return
	}

	datastores := cloudContract.Datastores
	if datastores == nil {
		err = telemetry.Error(ctx, span, nil, "datastores is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
		return
	}

	var matchingDatastore *porterv1.ManagedDatastore
	for _, ds := range datastores {
		if ds.Id == datastoreRecord.ID.String() {
			matchingDatastore = ds
			break
		}
	}
	if matchingDatastore == nil {
		err = telemetry.Error(ctx, span, nil, "datastore not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
		return
	}
	encoded, err := helpers.MarshalContractObject(ctx, matchingDatastore)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error marshaling datastore")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	b64 := base64.StdEncoding.EncodeToString(encoded)

	datastore := datastore.Datastore{
		Name:                              datastoreRecord.Name,
		Type:                              datastoreRecord.Type,
		Engine:                            datastoreRecord.Engine,
		CreatedAtUTC:                      datastoreRecord.CreatedAt,
		Status:                            string(datastoreRecord.Status),
		CloudProvider:                     SupportedDatastoreCloudProvider_AWS,
		CloudProviderCredentialIdentifier: datastoreRecord.CloudProviderCredentialIdentifier,
		B64Proto:                          b64,
	}

	resp.Datastore = datastore
	c.WriteResult(w, r, resp)
}

// LEGACY_handleGetDatastore retrieves the datastore in the given project for datastores that are on the customer clusters rather than the management cluster
func (c *GetDatastoreHandler) LEGACY_handleGetDatastore(ctx context.Context, projectId uint, accountId string, datastoreName string) (datastore.Datastore, error) {
	ctx, span := telemetry.NewSpan(ctx, "legacy-handle-get-datastore")
	defer span.End()

	var datastore datastore.Datastore

	datastores, err := Datastores(ctx, DatastoresInput{
		ProjectID: projectId,
		CloudProvider: cloud_provider.CloudProvider{
			AccountID: accountId,
			Type:      porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS,
		},
		Name:                datastoreName,
		IncludeEnvGroup:     true,
		IncludeMetadata:     true,
		CCPClient:           c.Config().ClusterControlPlaneClient,
		DatastoreRepository: c.Repo().Datastore(),
	})
	if err != nil {
		return datastore, err
	}

	if len(datastores) != 1 {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "datastore-count", Value: len(datastores)})
		if len(datastores) == 0 {
			return datastore, telemetry.Error(ctx, span, nil, "datastore not found")
		}
		return datastore, telemetry.Error(ctx, span, nil, "unexpected number of datastores found matching filters")
	}

	return datastores[0], nil
}
