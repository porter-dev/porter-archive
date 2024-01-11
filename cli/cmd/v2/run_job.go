package v2

import (
	"context"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/fatih/color"

	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/server/handlers/porter_app"
	"github.com/porter-dev/porter/cli/cmd/config"
)

const WaitIntervalInSeconds = 30 * time.Second

// RunAppJobInput is the input for the RunAppJob function
type RunAppJobInput struct {
	// CLIConfig is the CLI configuration
	CLIConfig config.CLIConfig
	// Client is the Porter API client
	Client api.Client

	AppName string
	JobName string

	// WaitForExit
	WaitForExit bool
}

// RunAppJob triggers a job run for an app and returns without waiting for the job to complete
func RunAppJob(ctx context.Context, inp RunAppJobInput) error {
	targetResp, err := inp.Client.DefaultDeploymentTarget(ctx, inp.CLIConfig.Project, inp.CLIConfig.Cluster)
	if err != nil {
		return fmt.Errorf("error calling default deployment target endpoint: %w", err)
	}

	currentAppRevisionResp, err := inp.Client.CurrentAppRevision(ctx, inp.CLIConfig.Project, inp.CLIConfig.Cluster, inp.AppName, targetResp.DeploymentTargetID)
	if err != nil {
		return fmt.Errorf("error getting current app revision: %w", err)
	}

	resp, err := inp.Client.RunAppJob(ctx, inp.CLIConfig.Project, inp.CLIConfig.Cluster, inp.AppName, inp.JobName, targetResp.DeploymentTargetID)
	if err != nil {
		return fmt.Errorf("unable to run job: %w", err)
	}

	triggeredBackgroundColor := color.FgGreen
	if inp.WaitForExit {
		triggeredBackgroundColor = color.FgBlue
	}
	color.New(triggeredBackgroundColor).Println("Triggered job with id:", resp.JobRunID) // nolint:errcheck,gosec

	if !inp.WaitForExit {
		return nil
	}

	decoded, err := base64.StdEncoding.DecodeString(currentAppRevisionResp.AppRevision.B64AppProto)
	if err != nil {
		return fmt.Errorf("unable to decode base64 app for revision: %w", err)
	}

	app := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, app)
	if err != nil {
		return fmt.Errorf("unable to unmarshal app for revision: %w", err)
	}

	var timeoutSeconds int64
	for _, service := range app.ServiceList {
		if inp.JobName != service.Name {
			continue
		}
		if service.GetJobConfig() == nil {
			return fmt.Errorf("error getting job timeout")
		}

		timeoutSeconds = service.GetJobConfig().TimeoutSeconds
	}

	timeout := time.Duration(timeoutSeconds) * time.Second
	deadline := time.Now().Add(timeout)

	color.New(color.FgBlue).Printf("Waiting %d seconds for job to complete\n", timeoutSeconds) // nolint:errcheck,gosec
	time.Sleep(2 * time.Second)

	input := api.RunAppJobStatusInput{
		ProjectID:                 inp.CLIConfig.Project,
		ClusterID:                 inp.CLIConfig.Cluster,
		AppName:                   inp.AppName,
		JobName:                   inp.JobName,
		DeploymentTargetID:        targetResp.DeploymentTargetID,
		JobRunID:                  resp.JobRunID,
		DeploymentTargetNamespace: targetResp.Namespace,
	}

	for time.Now().Before(deadline) {
		statusResp, err := inp.Client.RunAppJobStatus(ctx, input)
		if err != nil {
			return fmt.Errorf("unable to get job status: %w", err)
		}

		switch statusResp.Status {
		case porter_app.PodStatus_Pending:
			print(".")
			time.Sleep(WaitIntervalInSeconds)
		case porter_app.PodStatus_Running:
			print(".")
			time.Sleep(WaitIntervalInSeconds)
		case porter_app.PodStatus_Succeeded:
			print("\n")
			color.New(color.FgGreen).Println("Job completed successfully") // nolint:errcheck,gosec
			return nil
		case porter_app.PodStatus_Failed:
			return fmt.Errorf("job exited with non-zero exit code: %w", err)
		case porter_app.PodStatus_Unknown:
			return fmt.Errorf("unknown job status: %w", err)
		}
	}

	return fmt.Errorf("timeout exceeded")
}
