package cluster

import (
	"net/http"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// NodeGroupsHandler is the handler for the /node-groups endpoint
type NodeGroupsHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

// NewNodeGroupsHandler returns a handler for handling node group requests
func NewNodeGroupsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *NodeGroupsHandler {
	return &NodeGroupsHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

// NodeGroupsResponse represents the response to a list node groups request
type NodeGroupsResponse struct {
	NodeGroups []NodeGroup `json:"node_groups"`
}

// NodeGroup represents a node group managed by a user
type NodeGroup struct {
	Name         string  `json:"name"`
	Id           string  `json:"id"`
	InstanceType string  `json:"instance_type"`
	RamMb        int32   `json:"ram_mb"`
	CpuCores     float32 `json:"cpu_cores"`
	GpuCores     int32   `json:"gpu_cores"`
}

// ServeHTTP handles GET requests to list node groups
func (c *NodeGroupsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-nodes")
	defer span.End()

	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	userNodeGroupReq := connect.NewRequest(&porterv1.UserNodeGroupsRequest{
		ProjectId: int64(project.ID),
		ClusterId: int64(cluster.ID),
	})

	ccpResp, err := c.Config().ClusterControlPlaneClient.UserNodeGroups(ctx, userNodeGroupReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating deployment target")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp == nil || ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp msg is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	var nodeGroups []NodeGroup
	for _, ng := range ccpResp.Msg.UserNodeGroups {
		nodeGroups = append(nodeGroups, NodeGroup{
			Name:         ng.Name,
			Id:           ng.Id,
			InstanceType: ng.InstanceType,
			RamMb:        ng.RamMb,
			CpuCores:     ng.CpuCores,
			GpuCores:     ng.GpuCores,
		})
	}

	res := &NodeGroupsResponse{
		NodeGroups: nodeGroups,
	}

	c.WriteResult(w, r, res)
}
