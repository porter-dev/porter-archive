package v2

import (
	"context"
	"errors"
	"fmt"

	api "github.com/porter-dev/porter/api/client"
)

// UpdateImage updates the image of an application
func UpdateImage(ctx context.Context, tag string, client api.Client, projectId, clusterId uint, appName string) (string, error) {
	targetResp, err := client.DefaultDeploymentTarget(ctx, projectId, clusterId)
	if err != nil {
		return "", fmt.Errorf("error calling default deployment target endpoint: %w", err)
	}

	if targetResp.DeploymentTargetID == "" {
		return "", errors.New("deployment target id is empty")
	}

	if tag == "" {
		tag = "latest"
	}

	resp, err := client.UpdateImage(ctx, projectId, clusterId, appName, targetResp.DeploymentTargetID, tag)
	if err != nil {
		return "", fmt.Errorf("unable to update image: %w", err)
	}

	return resp.Tag, nil
}
