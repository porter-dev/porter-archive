package deployment_target

import (
	"net/http"

	"github.com/google/uuid"
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

// CreateDeploymentTargetRequest is the request object for the /deployment-targets POST endpoint
type CreateDeploymentTargetRequest struct {
	Selector string `json:"selector"`
	Preview  bool   `json:"preview"`
}

// CreateDeploymentTargetResponse is the response object for the /deployment-targets POST endpoint
type CreateDeploymentTargetResponse struct {
	DeploymentTargetID string `json:"deployment_target_id"`
}

// ServeHTTP handles POST requests to create a new deployment target
func (c *CreateDeploymentTargetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-deployment-target")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	request := &CreateDeploymentTargetRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if request.Selector == "" {
		err := telemetry.Error(ctx, span, nil, "name is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	var res *CreateDeploymentTargetResponse

	existingDeploymentTarget, err := c.Repo().DeploymentTarget().DeploymentTargetBySelectorAndSelectorType(
		project.ID,
		cluster.ID,
		request.Selector,
		string(models.DeploymentTargetSelectorType_Namespace),
	)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error checking for existing deployment target")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if existingDeploymentTarget.ID != uuid.Nil {
		res = &CreateDeploymentTargetResponse{
			DeploymentTargetID: existingDeploymentTarget.ID.String(),
		}
		c.WriteResult(w, r, res)
		return
	}

	deploymentTarget := &models.DeploymentTarget{
		ProjectID:    int(project.ID),
		ClusterID:    int(cluster.ID),
		Selector:     request.Selector,
		SelectorType: models.DeploymentTargetSelectorType_Namespace,
		Preview:      request.Preview,
	}
	deploymentTarget, err = c.Repo().DeploymentTarget().CreateDeploymentTarget(deploymentTarget)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating deployment target")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if deploymentTarget.ID == uuid.Nil {
		err := telemetry.Error(ctx, span, nil, "deployment target id is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res = &CreateDeploymentTargetResponse{
		DeploymentTargetID: deploymentTarget.ID.String(),
	}

	c.WriteResult(w, r, res)
}
