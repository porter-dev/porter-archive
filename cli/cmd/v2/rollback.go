package v2

import (
	"context"
	"fmt"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
)

// RollbackInput is the input for the Rollback function
type RollbackInput struct {
	// CLIConfig is the CLI configuration
	CLIConfig config.CLIConfig
	// Client is the Porter API client
	Client api.Client
	// AppName is the name of the app to rollback
	AppName string
	// DeploymentTargetName is the name of the deployment target to rollback
	DeploymentTargetName string
}

// Rollback deploys the previous successful revision of an app
func Rollback(ctx context.Context, inp RollbackInput) error {
	color.New(color.FgGreen).Printf("Rolling back to last deployed revision ...\n") // nolint:errcheck,gosec

	rollbackResp, err := inp.Client.RollbackRevision(ctx, inp.CLIConfig.Project, inp.CLIConfig.Cluster, inp.AppName, inp.DeploymentTargetName)
	if err != nil {
		return fmt.Errorf("error calling rollback revision endpoint: %w", err)
	}

	color.New(color.FgGreen).Printf("Successfully rolled back to revision %d\n", rollbackResp.TargetRevisionNumber) // nolint:errcheck,gosec
	return nil
}
