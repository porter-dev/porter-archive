package datastore

import (
	"net/http"

	"connectrpc.com/connect"
	"github.com/google/uuid"
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

// Credential has all information about connecting to a datastore
type Credential struct {
	Host         string `json:"host"`
	Port         int    `json:"port"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	DatabaseName string `json:"database_name"`
}

// DatastoreCredentialsResponse describes the datastore credentials response body
type DatastoreCredentialsResponse struct {
	// Credential is the credential that has been retrieved for this datastore
	Credential Credential `json:"credential"`
}

// DatastoreCredentialsHandler is a struct for retrieving credentials for datastore
type DatastoreCredentialsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewDatastoreCredentialsHandler returns a DatastoreCredentialsHandler
func NewDatastoreCredentialsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DatastoreCredentialsHandler {
	return &DatastoreCredentialsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServeHTTP retrieves the credentials for a datastore
func (c *DatastoreCredentialsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-datastore-credentials")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	if project.ID == 0 {
		err := telemetry.Error(ctx, span, nil, "project not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	projectId := int64(project.ID)

	var resp DatastoreCredentialsResponse

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
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	message := porterv1.CreateDatastoreProxyRequest{
		ProjectId:   projectId,
		DatastoreId: datastoreRecord.ID.String(),
	}
	req := connect.NewRequest(&message)
	ccpResp, err := c.Config().ClusterControlPlaneClient.CreateDatastoreProxy(ctx, req)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating datastore proxy")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp == nil || ccpResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "error creating datastore proxy")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	resp = DatastoreCredentialsResponse{
		Credential: Credential{
			Host:         ccpResp.Msg.Credential.Host,
			Port:         int(ccpResp.Msg.Credential.Port),
			Username:     ccpResp.Msg.Credential.Username,
			Password:     ccpResp.Msg.Credential.Password,
			DatabaseName: ccpResp.Msg.Credential.DatabaseName,
		},
	}

	c.WriteResult(w, r, resp)
}
