package commands

import (
	"context"
	"os"

	api "github.com/porter-dev/porter/api/client"
	ptypes "github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/spf13/cobra"
)

func registerCommand_Docker() *cobra.Command {
	dockerCmd := &cobra.Command{
		Use:   "docker",
		Short: "Commands to configure Docker for a project",
	}

	configureCmd := &cobra.Command{
		Use:   "configure",
		Short: "Configures the host's Docker instance",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, args, dockerConfig)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	dockerCmd.AddCommand(configureCmd)
	return dockerCmd
}

func dockerConfig(ctx context.Context, user *ptypes.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, currentProfile string, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	return config.SetDockerConfig(ctx, client, cliConf.Project)
}
