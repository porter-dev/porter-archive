package cmd

import (
	"os"

	api "github.com/porter-dev/porter/api/client"
	ptypes "github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/spf13/cobra"
)

var dockerCmd = &cobra.Command{
	Use:   "docker",
	Short: "Commands to configure Docker for a project",
}

var configureCmd = &cobra.Command{
	Use:   "configure",
	Short: "Configures the host's Docker instance",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, dockerConfig)
		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(dockerCmd)

	dockerCmd.AddCommand(configureCmd)
}

func dockerConfig(user *ptypes.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	return config.SetDockerConfig(client)
}
