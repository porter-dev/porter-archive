package datastore

import (
	"context"
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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-datastore-delete")
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

	cluster, err := h.getClusterForDatastore(ctx, r, project.ID, request.Name)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to find datastore on any associated cluster")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID})

	helmAgent, err := h.GetHelmAgent(ctx, r, cluster, "ack-system")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to get helm client for cluster")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	_, err = helmAgent.GetRelease(ctx, request.Name, 0, false)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to get helm release")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
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
}

func (h *DeleteDatastoreHandler) getClusterForDatastore(ctx context.Context, r *http.Request, projectID uint, datastoreName string) (*models.Cluster, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-cluster-for-datastore")

	if r == nil {
		return nil, telemetry.Error(ctx, span, nil, "missing http request object")
	}

	clusters, err := h.Repo().Cluster().ListClustersByProjectID(projectID)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "unable to get project clusters")
	}

	for _, cluster := range clusters {
		helmAgent, err := h.GetHelmAgent(ctx, r, cluster, "ack-system")
		if err != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID})
			return nil, telemetry.Error(ctx, span, err, "unable to get helm client for cluster")
		}

		_, err = helmAgent.GetRelease(ctx, datastoreName, 0, false)
		if err == nil {
			return cluster, nil
		}
	}

	return nil, telemetry.Error(ctx, span, nil, "unable to find datastore on any associated cluster")
}
