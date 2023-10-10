package v2

import (
	"context"
	"fmt"

	"github.com/fatih/color"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
)

// RollbackInput is the input for the Rollback function
type RollbackInput struct {
	// CLIConfig is the CLI configuration
	CLIConfig config.CLIConfig
	// Client is the Porter API client
	Client api.Client
	// AppName is the name of the app to rollback
	AppName string
}

// Rollback deploys the previous successful revision of an app
func Rollback(ctx context.Context, inp RollbackInput) error {
	targetResp, err := inp.Client.DefaultDeploymentTarget(ctx, inp.CLIConfig.Project, inp.CLIConfig.Cluster)
	if err != nil {
		return fmt.Errorf("error calling default deployment target endpoint: %w", err)
	}
	deploymentTargetID := targetResp.DeploymentTargetID

	listResp, err := inp.Client.ListAppRevisions(ctx, inp.CLIConfig.Project, inp.CLIConfig.Cluster, inp.AppName, deploymentTargetID)
	if err != nil {
		return fmt.Errorf("error calling current app revision endpoint: %w", err)
	}
	if len(listResp.AppRevisions) <= 1 {
		return fmt.Errorf("no previous successful revisions found for app %s", inp.AppName)
	}

	revisions := listResp.AppRevisions
	var rollbackTarget porter_app.Revision

	for _, rev := range revisions[1:] {
		if rev.RevisionNumber != 0 && rev.Status == models.AppRevisionStatus_Deployed {
			rollbackTarget = rev
			break
		}
	}

	color.New(color.FgGreen).Printf("Rolling back to revision %d...\n", rollbackTarget.RevisionNumber)

	applyResp, err := inp.Client.ApplyPorterApp(ctx, inp.CLIConfig.Project, inp.CLIConfig.Cluster, rollbackTarget.B64AppProto, deploymentTargetID, "", false)
	if err != nil {
		return fmt.Errorf("error calling apply endpoint: %w", err)
	}

	if applyResp.CLIAction != porterv1.EnumCLIAction_ENUM_CLI_ACTION_NONE {
		return fmt.Errorf("unexpected CLI action: %s", applyResp.CLIAction)
	}

	color.New(color.FgGreen).Printf("Successfully rolled back to revision %d\n", rollbackTarget.RevisionNumber)
	return nil
}
