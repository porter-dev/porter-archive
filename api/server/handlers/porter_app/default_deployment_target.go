package porter_app

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// DefaultDeploymentTargetHandler handles requests to the /apps/default-deployment-target endpoint
type DefaultDeploymentTargetHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewDefaultDeploymentTargetHandler returns a new DefaultDeploymentTargetHandler
func NewDefaultDeploymentTargetHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DefaultDeploymentTargetHandler {
	return &DefaultDeploymentTargetHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// DefaultDeploymentTargetRequest is the request object for the /apps/default-deployment-target endpoint
type DefaultDeploymentTargetRequest struct{}

// DefaultDeploymentTargetResponse is the response object for the /apps/default-deployment-target endpoint
type DefaultDeploymentTargetResponse struct {
	DeploymentTargetID string `json:"deployment_target_id"`
}

const (
	// DeploymentTargetSelector_Default is the selector for the default deployment target in a cluster
	DeploymentTargetSelector_Default = "default"
	// DeploymentTargetSelectorType_Default is the selector type for the default deployment target in a cluster
	DeploymentTargetSelectorType_Default = "NAMESPACE"
)

// ServeHTTP receives a project id and cluster id and returns the default deployment target in the cluster
func (c *DefaultDeploymentTargetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-default-deployment-target")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
	)

	defaultDeploymentTarget, err := c.Repo().DeploymentTarget().DeploymentTargetBySelectorAndSelectorType(project.ID, cluster.ID, DeploymentTargetSelector_Default, DeploymentTargetSelectorType_Default)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting default deployment target from repo")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if defaultDeploymentTarget.ID == uuid.Nil {
		err := telemetry.Error(ctx, span, err, "default deployment target not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: defaultDeploymentTarget.ID.String()})

	response := &DefaultDeploymentTargetResponse{
		DeploymentTargetID: defaultDeploymentTarget.ID.String(),
	}

	c.WriteResult(w, r, response)
}
