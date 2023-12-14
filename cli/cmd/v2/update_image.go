package v2

import (
	"context"
	"errors"
	"fmt"

	api "github.com/porter-dev/porter/api/client"
)

// UpdateImage updates the image of an application
func UpdateImage(ctx context.Context, tag string, client api.Client, projectId, clusterId uint, appName string, deploymentTargetName string) (string, error) {
	if deploymentTargetName == "" {
		return "", errors.New("please provide a deployment target")
	}

	if tag == "" {
		tag = "latest"
	}

	resp, err := client.UpdateImage(ctx, projectId, clusterId, appName, deploymentTargetName, tag)
	if err != nil {
		return "", fmt.Errorf("unable to update image: %w", err)
	}

	return resp.Tag, nil
}
