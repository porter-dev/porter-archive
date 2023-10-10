package deployment_target

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/deployment_target"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// GetDeploymentTargetHandler is the handler for the /deployment-targets/{deployment_target_id} endpoint
type GetDeploymentTargetHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewGetDeploymentTargetHandler handles GET requests to the endpoint /deployment-targets/{deployment_target_id}
func NewGetDeploymentTargetHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetDeploymentTargetHandler {
	return &GetDeploymentTargetHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// GetDeploymentTargetRequest is the request object for the /deployment-targets/{deployment_target_id} GET endpoint
type GetDeploymentTargetRequest struct {
	Preview bool `json:"preview"`
}

// GetDeploymentTargetResponse is the response object for the /deployment-targets/{deployment_target_id} GET endpoint
type GetDeploymentTargetResponse struct {
	DeploymentTarget deployment_target.DeploymentTarget `json:"deployment_target"`
}

func (c *GetDeploymentTargetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-deployment-target")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	deploymentTargetID, reqErr := requestutils.GetURLParamString(r, types.URLParamDeploymentTargetID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error parsing deployment target id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if deploymentTargetID == "" {
		err := telemetry.Error(ctx, span, nil, "deployment target id cannot be empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	deploymentTarget, err := deployment_target.DeploymentTargetDetails(ctx, deployment_target.DeploymentTargetDetailsInput{
		ProjectID:          int64(project.ID),
		ClusterID:          int64(cluster.ID),
		DeploymentTargetID: deploymentTargetID,
		CCPClient:          c.Config().ClusterControlPlaneClient,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting deployment target details")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := &GetDeploymentTargetResponse{
		DeploymentTarget: deploymentTarget,
	}

	c.WriteResult(w, r, res)
}
