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

type StatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

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

	request := &types.DatastoreStatusRequest{}
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
	default:
		datastoreType = porterv1.EnumDatastore_ENUM_DATASTORE_UNSPECIFIED
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

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "datastore-status", Value: resp.Msg.Status})
	h.WriteResult(w, r, types.DatastoreStatusResponse{
		Status: resp.Msg.Status,
	})
}
