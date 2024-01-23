package porter_app

import (
	"context"
	"net/http"
	"time"

	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"

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

	defaultDeploymentTarget, err := DefaultDeploymentTarget(ctx, DefaultDeploymentTargetInput{
		ProjectID:                 project.ID,
		ClusterID:                 cluster.ID,
		ClusterControlPlaneClient: c.Config().ClusterControlPlaneClient,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting default deployment target")
		c.WriteResult(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	response := &DefaultDeploymentTargetResponse{
		DeploymentTargetID: defaultDeploymentTarget.ID.String(),
		DeploymentTarget:   defaultDeploymentTarget,
	}

	c.WriteResult(w, r, response)
}

type DefaultDeploymentTargetInput struct {
	ProjectID                 uint
	ClusterID                 uint
	ClusterControlPlaneClient porterv1connect.ClusterControlPlaneServiceClient
}

func DefaultDeploymentTarget(ctx context.Context, input DefaultDeploymentTargetInput) (types.DeploymentTarget, error) {
	ctx, span := telemetry.NewSpan(ctx, "default-deployment-target")
	defer span.End()

	var defaultDeploymentTarget types.DeploymentTarget

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: input.ProjectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: input.ClusterID},
	)

	defaultDeploymentTargetReq := connect.NewRequest(&porterv1.DefaultDeploymentTargetRequest{
		ProjectId: int64(input.ProjectID),
		ClusterId: int64(input.ClusterID),
	})

	defaultDeploymentTargetResp, err := input.ClusterControlPlaneClient.DefaultDeploymentTarget(ctx, defaultDeploymentTargetReq)
	if err != nil {
		return defaultDeploymentTarget, telemetry.Error(ctx, span, err, "error getting default deployment target")
	}

	if defaultDeploymentTargetResp == nil || defaultDeploymentTargetResp.Msg == nil {
		return defaultDeploymentTarget, telemetry.Error(ctx, span, nil, "default deployment target response is nil")
	}

	deploymentTargetProto := defaultDeploymentTargetResp.Msg.DeploymentTarget

	id, err := uuid.Parse(deploymentTargetProto.Id)
	if err != nil {
		return defaultDeploymentTarget, telemetry.Error(ctx, span, err, "error parsing default deployment target id")
	}

	if id == uuid.Nil {
		return defaultDeploymentTarget, telemetry.Error(ctx, span, nil, "default deployment target id is nil")
	}

	defaultDeploymentTarget = types.DeploymentTarget{
		ID:        id,
		ProjectID: uint(deploymentTargetProto.ProjectId),
		ClusterID: uint(deploymentTargetProto.ClusterId),
		Name:      deploymentTargetProto.Name,
		Namespace: deploymentTargetProto.Namespace,
		IsPreview: deploymentTargetProto.IsPreview,
		IsDefault: deploymentTargetProto.IsDefault,
		CreatedAt: time.Time{}, // not provided by default deployment target response
		UpdatedAt: time.Time{}, // not provided by default deployment target response
	}

	return defaultDeploymentTarget, nil
}
