package deployment_target

import (
	"context"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"
	"github.com/porter-dev/porter/internal/telemetry"
)

// DeploymentTargetDetailsInput is the input to the DeploymentTargetDetails function
type DeploymentTargetDetailsInput struct {
	ProjectID          int64
	ClusterID          int64
	DeploymentTargetID string
	CCPClient          porterv1connect.ClusterControlPlaneServiceClient
}

// DeploymentTarget is a struct representing the unique cluster, namespace pair for a deployment target
type DeploymentTarget struct {
	ClusterID int64  `json:"cluster_id"`
	Namespace string `json:"namespace"`
}

// DeploymentTargetDetails gets the deployment target details from CCP
func DeploymentTargetDetails(ctx context.Context, inp DeploymentTargetDetailsInput) (DeploymentTarget, error) {
	ctx, span := telemetry.NewSpan(ctx, "deployment-target-details")
	defer span.End()

	var deploymentTarget DeploymentTarget

	if inp.ClusterID == 0 {
		return deploymentTarget, telemetry.Error(ctx, span, nil, "cluster id is empty")
	}
	if inp.ProjectID == 0 {
		return deploymentTarget, telemetry.Error(ctx, span, nil, "project id is empty")
	}
	if inp.DeploymentTargetID == "" {
		return deploymentTarget, telemetry.Error(ctx, span, nil, "deployment target id is empty")
	}
	if inp.CCPClient == nil {
		return deploymentTarget, telemetry.Error(ctx, span, nil, "cluster control plane client is nil")
	}

	deploymentTargetDetailsReq := connect.NewRequest(&porterv1.DeploymentTargetDetailsRequest{
		ProjectId:          inp.ProjectID,
		DeploymentTargetId: inp.DeploymentTargetID,
	})

	deploymentTargetDetailsResp, err := inp.CCPClient.DeploymentTargetDetails(ctx, deploymentTargetDetailsReq)
	if err != nil {
		return deploymentTarget, telemetry.Error(ctx, span, err, "error getting deployment target details from cluster control plane client")
	}

	if deploymentTargetDetailsResp == nil || deploymentTargetDetailsResp.Msg == nil {
		return deploymentTarget, telemetry.Error(ctx, span, err, "deployment target details resp is nil")
	}

	if deploymentTargetDetailsResp.Msg.ClusterId != inp.ClusterID {
		return deploymentTarget, telemetry.Error(ctx, span, err, "deployment target details resp cluster id does not match cluster id")
	}

	deploymentTarget = DeploymentTarget{
		Namespace: deploymentTargetDetailsResp.Msg.Namespace,
		ClusterID: deploymentTargetDetailsResp.Msg.ClusterId,
	}

	return deploymentTarget, nil
}
