package deployment_target

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListDeploymentTargetsHandler is the handler for the /deployment-targets endpoint
type ListDeploymentTargetsHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewListDeploymentTargetsHandler handles GET requests to the endpoint /deployment-targets
func NewListDeploymentTargetsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListDeploymentTargetsHandler {
	return &ListDeploymentTargetsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *ListDeploymentTargetsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-deployment-targets")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cluster-provided", Value: cluster != nil})

	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	request := &types.ListDeploymentTargetsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	var deploymentTargets []*models.DeploymentTarget
	var err error

	if cluster != nil {
		deploymentTargets, err = c.Repo().DeploymentTarget().ListForCluster(project.ID, cluster.ID, request.Preview)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error retrieving deployment targets for cluster")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	} else {
		deploymentTargets, err = c.Repo().DeploymentTarget().List(project.ID, request.Preview)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error retrieving deployment targets for project")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	response := types.ListDeploymentTargetsResponse{
		DeploymentTargets: make([]types.DeploymentTarget, 0),
	}

	for _, dt := range deploymentTargets {
		if dt == nil {
			continue
		}

		response.DeploymentTargets = append(response.DeploymentTargets, *dt.ToDeploymentTargetType())
	}

	c.WriteResult(w, r, response)
}
