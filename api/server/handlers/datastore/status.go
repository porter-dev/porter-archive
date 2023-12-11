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
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// StatusRequest describes an inbound datastore status request
type StatusRequest struct {
	Type string `json:"type"`
	Name string `json:"name"`
}

// StatusResponse describes an outbound datastore status response
type StatusResponse struct {
	Status string `json:"status"`
}

// StatusHandler is a struct for handling datastore status requests
type StatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewStatusHandler constructs a datastore StatusHandler
func NewStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *StatusHandler {
	return &StatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (h *StatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-datastore-status")
	defer span.End()
	// read the project from context
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

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

	var datastoreType porterv1.EnumDatastore
	switch request.Type {
	case "rds-postgresql":
		datastoreType = porterv1.EnumDatastore_ENUM_DATASTORE_RDS_POSTGRESQL
	case "rds-postgresql-aurora":
		datastoreType = porterv1.EnumDatastore_ENUM_DATASTORE_RDS_AURORA_POSTGRESQL
	case "elasticache-redis":
		datastoreType = porterv1.EnumDatastore_ENUM_DATASTORE_ELASTICACHE_REDIS
	default:
		err := telemetry.Error(ctx, span, nil, "invalid datastore specified")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	req := connect.NewRequest(&porterv1.DatastoreStatusRequest{
		ProjectId: int64(project.ID),
		ClusterId: int64(cluster.ID),
		Type:      datastoreType,
		Name:      request.Name,
	})

	resp, err := h.Config().ClusterControlPlaneClient.DatastoreStatus(ctx, req)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error fetching datastore status from ccp")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if resp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "missing response message from ccp")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "datastore-status", Value: resp.Msg.Status})
	h.WriteResult(w, r, StatusResponse{
		Status: resp.Msg.Status,
	})
}
