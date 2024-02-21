package datastore

import (
	"net/http"

	"github.com/aws/aws-sdk-go/aws/arn"
	"github.com/google/uuid"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
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

// GetDatastoreResponse describes the list datastores response body
type GetDatastoreResponse struct {
	// Datastore is the datastore that has been retrieved
	Datastore Datastore `json:"datastore"`
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

	datastore := Datastore{
		Name:         datastoreRecord.Name,
		Type:         datastoreRecord.Type,
		Engine:       datastoreRecord.Engine,
		CreatedAtUTC: datastoreRecord.CreatedAt,
		Status:       string(datastoreRecord.Status),
	}

	if datastoreRecord.CloudProvider != SupportedDatastoreCloudProvider_AWS {
		err = telemetry.Error(ctx, span, nil, "unsupported datastore cloud provider")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	awsArn, err := arn.Parse(datastoreRecord.CloudProviderCredentialIdentifier)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error parsing aws account id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	datastores, err := Datastores(ctx, DatastoresInput{
		ProjectID: project.ID,
		CloudProvider: cloud_provider.CloudProvider{
			AccountID: awsArn.AccountID,
			Type:      porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS,
		},
		Name:                datastoreName,
		IncludeEnvGroup:     true,
		IncludeMetadata:     true,
		CCPClient:           c.Config().ClusterControlPlaneClient,
		DatastoreRepository: c.Repo().Datastore(),
	})
	if err == nil && len(datastores) == 1 {
		datastore = datastores[0]
	}

	resp.Datastore = datastore

	c.WriteResult(w, r, resp)
}
