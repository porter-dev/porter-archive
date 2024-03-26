package v2

import (
	"context"
	"errors"
	"fmt"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
)

// AppPushInput is the input to the AppPush function
type AppPushInput struct {
	// CLIConfig is the CLI configuration
	CLIConfig config.CLIConfig
	// Client is the Porter API client
	Client api.Client
	// AppName is the name of the app
	AppName string
	// DeploymentTargetName is the name of the deployment target, if provided
	DeploymentTargetName string
	// ImageTag is the image tag to use for the app build
	ImageTag string
}

// AppPush pushes an app to a remote registry
func AppPush(ctx context.Context, inp AppPushInput) error {
	cliConf := inp.CLIConfig
	client := inp.Client

	if cliConf.Project == 0 {
		return errors.New("project must be set")
	}

	if cliConf.Cluster == 0 {
		return errors.New("cluster must be set")
	}

	latest, err := client.CurrentAppRevision(ctx, api.CurrentAppRevisionInput{
		ProjectID:            cliConf.Project,
		ClusterID:            cliConf.Cluster,
		AppName:              inp.AppName,
		DeploymentTargetName: inp.DeploymentTargetName,
	})
	if err != nil {
		return fmt.Errorf("error getting latest app revision: %s", err)
	}

	settings, err := client.GetBuildFromRevision(ctx, api.GetBuildFromRevisionInput{
		ProjectID:     cliConf.Project,
		ClusterID:     cliConf.Cluster,
		AppName:       inp.AppName,
		AppRevisionID: latest.AppRevision.ID,
	})
	if err != nil {
		return fmt.Errorf("error getting build from revision: %w", err)
	}

	tagForPush, err := tagFromCommitSHAOrFlag(inp.ImageTag)
	if err != nil {
		return fmt.Errorf("error getting tag for build: %w", err)
	}

	// push the image to the remote registry
	err = push(ctx, client, pushInput{
		ProjectID:     cliConf.Project,
		ImageTag:      tagForPush,
		RepositoryURL: settings.Image.Repository,
	})
	if err != nil {
		return fmt.Errorf("error pushing image: %w", err)
	}

	return nil
}
