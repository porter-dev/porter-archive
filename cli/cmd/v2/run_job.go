package v2

import (
	"context"
	"fmt"

	"github.com/fatih/color"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
)

type RunAppJobInput struct {
	// CLIConfig is the CLI configuration
	CLIConfig config.CLIConfig
	// Client is the Porter API client
	Client api.Client

	AppName string
	JobName string
}

// RunAppJob triggers a job run for an app and returns without waiting for the job to complete
func RunAppJob(ctx context.Context, inp RunAppJobInput) error {
	targetResp, err := inp.Client.DefaultDeploymentTarget(ctx, inp.CLIConfig.Project, inp.CLIConfig.Cluster)
	if err != nil {
		return fmt.Errorf("error calling default deployment target endpoint: %w", err)
	}

	resp, err := inp.Client.RunAppJob(ctx, inp.CLIConfig.Project, inp.CLIConfig.Cluster, inp.AppName, inp.JobName, targetResp.DeploymentTargetID)
	if err != nil {
		return fmt.Errorf("unable to run job: %w", err)
	}

	color.New(color.FgGreen).Println("Triggered job with id:", resp.JobRunID) // nolint:errcheck,gosec

	return nil
}
