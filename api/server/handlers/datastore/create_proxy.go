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
	Host         string
	Port         int
	Username     string
	Password     string
	DatabaseName string
}

// CreateDatastoreProxyResponse is the response body for the create datastore proxy endpoint
type CreateDatastoreProxyResponse struct {
	// PodName is the name of the pod that was created
	PodName string `json:"pod_name"`
	// Credential is the credential used to connect to the datastore
	Credential Credential `json:"credential"`
	// ClusterID is the ID of the cluster that the pod was created in
	ClusterID uint `json:"cluster_id"`
	// Namespace is the namespace that the pod was created in
	Namespace string `json:"namespace"`
	// Type is the type of datastore
	Type string `json:"type"`
}

// CreateDatastoreProxyHandler is a handler for creating a datastore proxy pod which is used to connect to the datastore
type CreateDatastoreProxyHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewCreateDatastoreProxyHandler returns a CreateDatastoreProxyHandler
func NewCreateDatastoreProxyHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateDatastoreProxyHandler {
	return &CreateDatastoreProxyHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServeHTTP creates a datastore proxy pod
func (c *CreateDatastoreProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-datastore-proxy")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	if project.ID == 0 {
		err := telemetry.Error(ctx, span, nil, "project not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	projectId := int64(project.ID)

	var resp CreateDatastoreProxyResponse

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

	resp = CreateDatastoreProxyResponse{
		PodName: ccpResp.Msg.PodName,
		Credential: Credential{
			Host:         ccpResp.Msg.Credential.Host,
			Port:         int(ccpResp.Msg.Credential.Port),
			Username:     ccpResp.Msg.Credential.Username,
			Password:     ccpResp.Msg.Credential.Password,
			DatabaseName: ccpResp.Msg.Credential.DatabaseName,
		},
		ClusterID: uint(ccpResp.Msg.ClusterId),
		Namespace: ccpResp.Msg.Namespace,
		Type:      datastoreRecord.Type,
	}

	c.WriteResult(w, r, resp)
}
