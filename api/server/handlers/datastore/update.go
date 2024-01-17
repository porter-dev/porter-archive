package datastore

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/datastore"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// UpdateDatastoreHandler is a struct for updating datastores
type UpdateDatastoreHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewUpdateDatastoreHandler constructs a datastore UpdateDatastoreHandler
func NewUpdateDatastoreHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateDatastoreHandler {
	return &UpdateDatastoreHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

type UpdateDatastoreRequest struct {
	Name         string `json:"name"`
	Type         string `json:"type"`
	Engine       string `json:"engine"`
	Base64Values string `json:"b64_values"`
}

// ServeHTTP updates a datastore using the decoded values
func (h *UpdateDatastoreHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-datastore")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &UpdateDatastoreRequest{}
	if ok := h.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding update datastore request")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// add record to db
	record, err := datastore.CreateOrGetDatastoreRecord(ctx, datastore.CreateOrGetDatastoreRecordInput{
		ProjectID: project.ID,
		ClusterID: cluster.ID,
		Name:      request.Name,
	})

	// install datastore

	// return success
}
