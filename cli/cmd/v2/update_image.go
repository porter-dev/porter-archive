package v2

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/porter-dev/porter/api/server/handlers/porter_app"

	"github.com/fatih/color"

	api "github.com/porter-dev/porter/api/client"
)

// UpdateImageInput is the input for the UpdateImage function
type UpdateImageInput struct {
	ProjectID               uint
	ClusterID               uint
	AppName                 string
	DeploymentTargetName    string
	Tag                     string
	WaitForSuccessfulUpdate bool
	Client                  api.Client
}

// DefaultWaitTimeout is the default timeout for waiting for an update-image to complete
const DefaultWaitTimeout = 10

// UpdateImage updates the image of an application
func UpdateImage(ctx context.Context, input UpdateImageInput) error {
	if input.DeploymentTargetName == "" {
		return errors.New("please provide a deployment target")
	}

	tag := input.Tag
	if tag == "" {
		tag = "latest"
	}

	resp, err := input.Client.UpdateImage(ctx, input.ProjectID, input.ClusterID, input.AppName, input.DeploymentTargetName, tag)
	if err != nil {
		return fmt.Errorf("unable to update image: %w", err)
	}

	triggeredBackgroundColor := color.FgGreen
	if input.WaitForSuccessfulUpdate {
		triggeredBackgroundColor = color.FgBlue
	}

	_, _ = color.New(triggeredBackgroundColor).Printf("Updated application %s to use tag \"%s\"\n", input.AppName, tag)

	if !input.WaitForSuccessfulUpdate {
		return nil
	}

	timeoutMinutes := DefaultWaitTimeout
	timeout := time.Duration(timeoutMinutes) * time.Minute
	deadline := time.Now().Add(timeout)

	color.New(color.FgBlue).Printf("Waiting %d minutes for update to complete\n", timeoutMinutes) // nolint:errcheck,gosec
	time.Sleep(2 * time.Second)
	for time.Now().Before(deadline) {
		status, err := input.Client.GetRevisionStatus(ctx, input.ProjectID, input.ClusterID, input.AppName, resp.RevisionID)
		if err != nil {
			return fmt.Errorf("error getting app revision status: %w", err)
		}

		if status == nil {
			return errors.New("unable to determine status of app revision")
		}

		switch status.HighLevelStatus {
		case porter_app.HighLevelStatus_Successful:
			_, _ = color.New(color.FgGreen).Printf("Update completed successfully\n") // nolint:errcheck,gosec
			return nil
		case porter_app.HighLevelStatus_Failed:
			return fmt.Errorf("update failed: check dashboard for details")
		case porter_app.HighLevelStatus_Progressing:
			// do nothing
		default:
			return fmt.Errorf("received unknown status: %s", status.HighLevelStatus)
		}

		time.Sleep(2 * time.Second)
	}

	return fmt.Errorf("timeout exceeded")
}
