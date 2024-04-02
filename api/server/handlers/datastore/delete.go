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

// DeleteDatastoreHandler is a struct for handling datastore deletion requests
type DeleteDatastoreHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewDeleteDatastoreHandler constructs a datastore DeleteDatastoreHandler
func NewDeleteDatastoreHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeleteDatastoreHandler {
	return &DeleteDatastoreHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (h *DeleteDatastoreHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-delete-datastore")
	defer span.End()
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	datastoreName, reqErr := requestutils.GetURLParamString(r, types.URLParamDatastoreName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing datastore name")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "datastore-name", Value: datastoreName})

	datastoreRecord, err := h.Repo().Datastore().GetByProjectIDAndName(ctx, project.ID, datastoreName)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "datastore record not found")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	req := connect.NewRequest(&porterv1.DeleteDatastoreRequest{
		ProjectId:   int64(project.ID),
		DatastoreId: datastoreRecord.ID.String(),
	})
	_, err = h.Config().ClusterControlPlaneClient.DeleteDatastore(ctx, req)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error deleting datastore")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	w.WriteHeader(http.StatusAccepted)
}
