package cluster

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
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
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	req := connect.NewRequest(&porterv1.ClusterStatusRequest{
		ProjectId: int64(cluster.ProjectID),
		ClusterId: int64(cluster.ID),
	})
	resp := ClusterStatusResponse{
		ProjectID: int(project.ID),
		ClusterID: int(cluster.ID),
	}

	status, err := c.Config().ClusterControlPlaneClient.ClusterStatus(ctx, req)
	if err != nil {
		telemetry.Error(ctx, span, err, "error getting cluster status")
		c.WriteResult(w, r, resp)
		return
	}
	if status.Msg == nil {
		telemetry.Error(ctx, span, nil, "error getting cluster status")
		c.WriteResult(w, r, resp)
		return
	}
	statusResp := status.Msg

	resp.Phase = statusResp.Phase
	resp.IsInfrastructureReady = statusResp.InfrastructureStatus
	resp.IsControlPlaneReady = statusResp.ControlPlaneStatus

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cluster-phase", Value: statusResp.Phase},
		telemetry.AttributeKV{Key: "cluster-infra-status", Value: statusResp.InfrastructureStatus},
		telemetry.AttributeKV{Key: "cluster-control-plane-status", Value: statusResp.ControlPlaneStatus},
	)

	c.WriteResult(w, r, resp)
	w.WriteHeader(http.StatusOK)
}
