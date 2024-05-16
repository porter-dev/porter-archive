package deployment_target

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

// DeleteDeploymentTargetHandler is the handler for DELETE /api/projects/{project_id}/targets/{deployment_target_identifier}
type DeleteDeploymentTargetHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewDeleteDeploymentTargetHandler creates a new DeleteDeploymentTargetHandler
func NewDeleteDeploymentTargetHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeleteDeploymentTargetHandler {
	return &DeleteDeploymentTargetHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServeHTTP deletes the deployment target from the project
func (c *DeleteDeploymentTargetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "server-delete-deployment-target")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	deploymentTarget, _ := ctx.Value(types.DeploymentTargetScope).(types.DeploymentTarget)

	deleteReq := connect.NewRequest(&porterv1.DeleteDeploymentTargetRequest{
		ProjectId: int64(project.ID),
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id:   deploymentTarget.ID.String(),
			Name: deploymentTarget.Name,
		},
	})

	_, err := c.Config().ClusterControlPlaneClient.DeleteDeploymentTarget(ctx, deleteReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error deleting deployment target")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	c.WriteResult(w, r, nil)
}
