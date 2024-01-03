package datastore

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// DeleteRequest describes an inbound datastore deletion request
type DeleteRequest struct {
	Type string `json:"type" form:"required"`
	Name string `json:"name" form:"required"`
}

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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-datastore-status")
	defer span.End()
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &StatusRequest{}
	if ok := h.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "datastore-name", Value: request.Name},
		telemetry.AttributeKV{Key: "datastore-type", Value: request.Type},
	)

	clusters, err := h.Repo().Cluster().ListClustersByProjectID(project.ID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to get project clusters")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	println("cluster length", len(clusters))
	for _, cluster := range clusters {
		helmAgent, err := h.GetHelmAgent(ctx, r, cluster, "ack-system")
		if err != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID})
			err := telemetry.Error(ctx, span, err, "unable to helm client for cluster")
			h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		_, err = helmAgent.GetRelease(ctx, request.Name, 0, false)
		if err != nil {
			continue
		}

		_, err = helmAgent.UninstallChart(ctx, request.Name)
		if err != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID})
			err := telemetry.Error(ctx, span, err, "unable to uninstall chart")
			h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		// if the release was deleted by helm without error, mark it as accepted
		w.WriteHeader(http.StatusAccepted)
		return
	}

	err = telemetry.Error(ctx, span, nil, "unable to find datastore on any associated cluster")
	h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
}
