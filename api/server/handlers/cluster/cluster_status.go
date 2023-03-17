package cluster

import (
	"fmt"
	"net/http"

	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
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
	ctx := r.Context()
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	req := connect.NewRequest(&porterv1.ClusterStatusRequest{
		ProjectId: int64(cluster.ProjectID),
		ClusterId: int64(cluster.ID),
	})
	status, err := c.Config().ClusterControlPlaneClient.ClusterStatus(ctx, req)
	if err != nil {
		e := fmt.Errorf("unable to retrieve status for cluster: %w", err)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
		return
	}
	if status.Msg == nil {
		e := fmt.Errorf("unable to parse status for cluster: %w", err)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
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

	c.WriteResult(w, r, resp)
	w.WriteHeader(http.StatusOK)
}
