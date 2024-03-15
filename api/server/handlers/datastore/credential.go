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
	"github.com/porter-dev/porter/internal/datastore"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// GetDatastoreCredentialResponse describes the datastore credential response body
type GetDatastoreCredentialResponse struct {
	// Credential is the credential that has been retrieved for this datastore
	Credential datastore.Credential `json:"credential"`
}

// GetDatastoreCredentialHandler is a struct for retrieving credentials for datastore
type GetDatastoreCredentialHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewGetDatastoreCredentialHandler returns a GetDatastoreCredentialHandler
func NewGetDatastoreCredentialHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetDatastoreCredentialHandler {
	return &GetDatastoreCredentialHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServeHTTP retrieves the credentials for a datastore
func (c *GetDatastoreCredentialHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-datastore-credential")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	if project.ID == 0 {
		err := telemetry.Error(ctx, span, nil, "project not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	projectId := int64(project.ID)

	var resp GetDatastoreCredentialResponse

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

	message := porterv1.DatastoreCredentialRequest{
		ProjectId:   projectId,
		DatastoreId: datastoreRecord.ID.String(),
	}
	req := connect.NewRequest(&message)
	ccpResp, err := c.Config().ClusterControlPlaneClient.DatastoreCredential(ctx, req)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting datastore credential")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp == nil || ccpResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "datastore credential not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	resp = GetDatastoreCredentialResponse{
		Credential: datastore.Credential{
			Host:         ccpResp.Msg.Credential.Host,
			Port:         int(ccpResp.Msg.Credential.Port),
			Username:     ccpResp.Msg.Credential.Username,
			Password:     ccpResp.Msg.Credential.Password,
			DatabaseName: ccpResp.Msg.Credential.DatabaseName,
		},
	}

	c.WriteResult(w, r, resp)
}
