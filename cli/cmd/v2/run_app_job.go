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
	"github.com/porter-dev/porter/cli/cmd/config"
	porter_app_internal "github.com/porter-dev/porter/internal/porter_app"
)

// WaitIntervalInSeconds is the amount of time to wait when polling for job status
const WaitIntervalInSeconds = 5 * time.Second

// RunAppJobInput is the input for the RunAppJob function
type RunAppJobInput struct {
	// CLIConfig is the CLI configuration
	CLIConfig config.CLIConfig
	// Client is the Porter API client
	Client api.Client
	// DeploymentTargetName is the name of deployment target to run the job on
	DeploymentTargetName string

	AppName string
	JobName string

	// WaitForExit
	WaitForExit bool
}

// RunAppJob triggers a job run for an app and returns without waiting for the job to complete
func RunAppJob(ctx context.Context, inp RunAppJobInput) error {
	currentAppRevisionResp, err := inp.Client.CurrentAppRevision(ctx, inp.CLIConfig.Project, inp.CLIConfig.Cluster, inp.AppName, inp.DeploymentTargetName) // nolint:staticcheck
	if err != nil {
		return fmt.Errorf("error getting current app revision: %w", err)
	}

	resp, err := inp.Client.RunAppJob(ctx, inp.CLIConfig.Project, inp.CLIConfig.Cluster, inp.AppName, inp.JobName, inp.DeploymentTargetName) // nolint:staticcheck
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

	timeoutSeconds := 1800 * time.Second
	for _, service := range app.ServiceList {
		if inp.JobName != service.Name {
			continue
		}
		if service.GetJobConfig() == nil {
			return fmt.Errorf("error getting job timeout")
		}

		timeoutSeconds = time.Duration(service.GetJobConfig().TimeoutSeconds) * time.Second
	}

	deadline := time.Now().Add(timeoutSeconds)

	color.New(color.FgBlue).Printf("Waiting %.f seconds for job to complete\n", timeoutSeconds.Seconds()) // nolint:errcheck,gosec
	time.Sleep(2 * time.Second)

	input := api.RunAppJobStatusInput{
		AppName:            inp.AppName,
		ClusterID:          inp.CLIConfig.Cluster,
		DeploymentTargetID: inp.DeploymentTargetName,
		ServiceName:        inp.JobName,
		JobRunID:           resp.JobRunID,
		ProjectID:          inp.CLIConfig.Project,
	}

	for time.Now().Before(deadline) {
		statusResp, err := inp.Client.RunAppJobStatus(ctx, input)
		if err != nil {
			return fmt.Errorf("unable to get job status: %w", err)
		}

		switch statusResp.Status {
		case porter_app_internal.InstanceStatusDescriptor_Pending:
			print(".")
			time.Sleep(WaitIntervalInSeconds)
		case porter_app_internal.InstanceStatusDescriptor_Running:
			print(".")
			time.Sleep(WaitIntervalInSeconds)
		case porter_app_internal.InstanceStatusDescriptor_Succeeded:
			print("\n")
			color.New(color.FgGreen).Println("Job completed successfully") // nolint:errcheck,gosec
			return nil
		case porter_app_internal.InstanceStatusDescriptor_Failed:
			return fmt.Errorf("job exited with non-zero exit code: %w", err)
		case porter_app_internal.InstanceStatusDescriptor_Unknown:
			return fmt.Errorf("unknown job status: %w", err)
		}
	}

	return fmt.Errorf("timeout exceeded")
}
