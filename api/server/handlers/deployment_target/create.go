package deployment_target

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// CreateDeploymentTargetHandler is the handler for the /deployment-targets endpoint
type CreateDeploymentTargetHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewCreateDeploymentTargetHandler handles POST requests to the endpoint /deployment-targets
func NewCreateDeploymentTargetHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateDeploymentTargetHandler {
	return &CreateDeploymentTargetHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ServeHTTP handles POST requests to create a new deployment target
func (c *CreateDeploymentTargetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-deployment-target")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	cluster, clusterOk := ctx.Value(types.ClusterScope).(*models.Cluster)
	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	request := &types.CreateDeploymentTargetRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if request.Selector == "" && request.Name == "" {
		err := telemetry.Error(ctx, span, nil, "name is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	clusterId := request.ClusterId
	if clusterOk {
		clusterId = cluster.ID
	}
	if clusterId == 0 {
		err := telemetry.Error(ctx, span, nil, "cluster id is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	name := request.Name
	if name == "" {
		name = request.Selector
	}

	createReq := connect.NewRequest(&porterv1.CreateDeploymentTargetRequest{
		ProjectId: int64(project.ID),
		ClusterId: int64(clusterId),
		Name:      name,
		Namespace: name,
		IsPreview: request.Preview,
	})

	ccpResp, err := c.Config().ClusterControlPlaneClient.CreateDeploymentTarget(ctx, createReq)
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
	if ccpResp.Msg.DeploymentTargetId == "" {
		err := telemetry.Error(ctx, span, nil, "deployment target id is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: ccpResp.Msg.DeploymentTargetId})

	res := &types.CreateDeploymentTargetResponse{
		DeploymentTargetID: ccpResp.Msg.DeploymentTargetId,
	}

	c.WriteResult(w, r, res)
}
