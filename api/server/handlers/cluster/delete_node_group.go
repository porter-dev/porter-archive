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

// DeleteNodeGroupHandler is the handler for the /delete-node-group endpoint
type DeleteNodeGroupHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewDeleteNodeGroupHandler returns a handler for handling node group requests
func NewDeleteNodeGroupHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeleteNodeGroupHandler {
	return &DeleteNodeGroupHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// DeleteNodeGroupRequest represents the request to delete a node group
type DeleteNodeGroupRequest struct {
	// NodeGroupId is the id of the node group to delete
	NodeGroupId string `json:"node_group_id"`
}

// DeleteNodeGroupResponse represents the response from deleting a node group
type DeleteNodeGroupResponse struct {
	// ContractRevisionId is the id of the contract revision created by the deletion
	ContractRevisionId string `json:"contract_revision_id"`
}

// ServeHTTP handles GET requests to list node groups
func (c *DeleteNodeGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-nodes")
	defer span.End()

	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &DeleteNodeGroupRequest{}

	ok := c.DecodeAndValidate(w, r, request)
	if !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding delete node group request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
	}

	if request.NodeGroupId == "" {
		err := telemetry.Error(ctx, span, nil, "node group id is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
	}

	userNodeGroupReq := connect.NewRequest(&porterv1.DeleteUserNodeGroupRequest{
		ProjectId:       int64(project.ID),
		ClusterId:       int64(cluster.ID),
		UserNodeGroupId: request.NodeGroupId,
	})

	ccpResp, err := c.Config().ClusterControlPlaneClient.DeleteUserNodeGroup(ctx, userNodeGroupReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error deleting user node group")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp == nil || ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp msg is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	resp := &DeleteNodeGroupResponse{
		ContractRevisionId: ccpResp.Msg.ContractRevisionId,
	}

	c.WriteResult(w, r, resp)
}
