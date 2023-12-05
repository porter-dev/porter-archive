package porter_app

import (
	"net/http"
	"time"

	"github.com/google/uuid"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// DefaultDeploymentTargetHandler handles requests to the /default-deployment-target endpoint
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

// DefaultDeploymentTargetRequest is the request object for the /default-deployment-target endpoint
type DefaultDeploymentTargetRequest struct{}

// DefaultDeploymentTargetResponse is the response object for the /default-deployment-target endpoint
type DefaultDeploymentTargetResponse struct {
	// Deprecated: use inline types.DeploymentTarget fields instead
	DeploymentTargetID     string `json:"deployment_target_id"`
	types.DeploymentTarget `json:"deployment_target"`
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

	defaultDeploymentTargetReq := connect.NewRequest(&porterv1.DefaultDeploymentTargetRequest{
		ProjectId: int64(project.ID),
		ClusterId: int64(cluster.ID),
	})

	defaultDeploymentTargetResp, err := c.Config().ClusterControlPlaneClient.DefaultDeploymentTarget(ctx, defaultDeploymentTargetReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting default deployment target")
		c.WriteResult(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if defaultDeploymentTargetResp == nil || defaultDeploymentTargetResp.Msg == nil {
		err := telemetry.Error(ctx, span, nil, "default deployment target response is nil")
		c.WriteResult(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	defaultDeploymentTarget := defaultDeploymentTargetResp.Msg.DeploymentTarget

	id, err := uuid.Parse(defaultDeploymentTarget.Id)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing default deployment target id")
		c.WriteResult(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if id == uuid.Nil {
		err := telemetry.Error(ctx, span, nil, "default deployment target id is nil")
		c.WriteResult(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := &DefaultDeploymentTargetResponse{
		DeploymentTargetID: defaultDeploymentTarget.Id,
		DeploymentTarget: types.DeploymentTarget{
			ID:        id,
			ProjectID: uint(defaultDeploymentTarget.ProjectId),
			ClusterID: uint(defaultDeploymentTarget.ClusterId),
			Name:      defaultDeploymentTarget.Name,
			Namespace: defaultDeploymentTarget.Namespace,
			IsPreview: defaultDeploymentTarget.IsPreview,
			IsDefault: defaultDeploymentTarget.IsDefault,
			CreatedAt: time.Time{}, // not provided by default deployment target response
			UpdatedAt: time.Time{}, // not provided by default deployment target response
		},
	}

	c.WriteResult(w, r, response)
}
