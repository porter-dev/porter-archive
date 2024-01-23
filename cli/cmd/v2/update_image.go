package v2

import (
	"context"
	"fmt"

	"github.com/fatih/color"

	api "github.com/porter-dev/porter/api/client"
)

// UpdateImageInput is the input for the UpdateImage function
type UpdateImageInput struct {
	ProjectID                   uint
	ClusterID                   uint
	AppName                     string
	DeploymentTargetName        string
	Tag                         string
	Client                      api.Client
	WaitForSuccessfulDeployment bool
}

// UpdateImage updates the image of an application
func UpdateImage(ctx context.Context, input UpdateImageInput) error {
	tag := input.Tag
	if tag == "" {
		tag = "latest"
	}

	resp, err := input.Client.UpdateImage(ctx, input.ProjectID, input.ClusterID, input.AppName, deploymentTargetName, tag)
	if err != nil {
		return fmt.Errorf("unable to update image: %w", err)
	}

	triggeredBackgroundColor := color.FgGreen

	_, _ = color.New(triggeredBackgroundColor).Printf("Updated application %s to use tag \"%s\"\n", input.AppName, tag)

	if input.WaitForSuccessfulDeployment {
		return waitForAppRevisionStatus(ctx, waitForAppRevisionStatusInput{
			ProjectID:  input.ProjectID,
			ClusterID:  input.ClusterID,
			AppName:    input.AppName,
			RevisionID: resp.RevisionID,
			Client:     input.Client,
		})
	}
	return nil
}
