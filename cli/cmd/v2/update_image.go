package v2

import (
	"context"
	"errors"
	"fmt"

	"github.com/fatih/color"

	api "github.com/porter-dev/porter/api/client"
)

// UpdateImageInput is the input for the UpdateImage function
type UpdateImageInput struct {
	ProjectID            uint
	ClusterID            uint
	AppName              string
	DeploymentTargetName string
	Tag                  string
	Client               api.Client
}

// UpdateImage updates the image of an application
func UpdateImage(ctx context.Context, input UpdateImageInput) (string, error) {
	if input.DeploymentTargetName == "" {
		return "", errors.New("please provide a deployment target")
	}

	tag := input.Tag
	if tag == "" {
		tag = "latest"
	}

	resp, err := input.Client.UpdateImage(ctx, input.ProjectID, input.ClusterID, input.AppName, input.DeploymentTargetName, tag)
	if err != nil {
		return "", fmt.Errorf("unable to update image: %w", err)
	}

	triggeredBackgroundColor := color.FgGreen

	_, _ = color.New(triggeredBackgroundColor).Printf("Updated application %s to use tag \"%s\"\n", input.AppName, tag)
	return resp.RevisionID, nil
}
