package v2

import (
	"context"
	"fmt"

	api "github.com/porter-dev/porter/api/client"
)

func ResolveDeploymentTargetNameFromFlag(ctx context.Context, client api.Client, projectID uint, clusterID uint, flaggedDeploymentTargetName string) (string, error) {
	targetID := flaggedDeploymentTargetName
	if targetID == "" {
		targetResp, err := client.DefaultDeploymentTarget(ctx, projectID, clusterID)
		if err != nil {
			return targetID, fmt.Errorf("error calling default deployment target endpoint: %w", err)
		}
		if targetResp == nil {
			return targetID, fmt.Errorf("default deployment target is empty")
		}
		targetID = targetResp.DeploymentTarget.Name
	}

	return targetID, nil
}
