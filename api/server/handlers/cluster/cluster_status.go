package cluster

import (
	"fmt"
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

type ClusterStatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewClusterStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ClusterStatusHandler {
	return &ClusterStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

type ClusterStatusResponse struct {
	ProjectID             int    `json:"project_id"`
	ClusterID             int    `json:"cluster_id"`
	Phase                 string `json:"phase"`
	IsInfrastructureReady bool   `json:"is_infrastructure_ready"`
	IsControlPlaneReady   bool   `json:"is_control_plane_ready"`
}

func (c *ClusterStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-cluster-status")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: cluster.ProjectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
	)

	req := connect.NewRequest(&porterv1.ClusterStatusRequest{
		ProjectId: int64(cluster.ProjectID),
		ClusterId: int64(cluster.ID),
	})
	status, err := c.Config().ClusterControlPlaneClient.ClusterStatus(ctx, req)
	if err != nil {
		err := fmt.Errorf("unable to retrieve status for cluster: %w", err)
		err = telemetry.Error(ctx, span, err, err.Error())
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	if status.Msg == nil {
		err := fmt.Errorf("unable to parse status for cluster: %w", err)
		err = telemetry.Error(ctx, span, err, err.Error())
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	statusResp := status.Msg

	resp := ClusterStatusResponse{
		ProjectID:             int(statusResp.ProjectId),
		ClusterID:             int(statusResp.ClusterId),
		Phase:                 statusResp.Phase,
		IsInfrastructureReady: statusResp.InfrastructureStatus,
		IsControlPlaneReady:   statusResp.ControlPlaneStatus,
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cluster-phase", Value: statusResp.Phase},
		telemetry.AttributeKV{Key: "cluster-infra-status", Value: statusResp.InfrastructureStatus},
		telemetry.AttributeKV{Key: "cluster-control-plane-status", Value: statusResp.ControlPlaneStatus},
	)

	c.WriteResult(w, r, resp)
	w.WriteHeader(http.StatusOK)
}
