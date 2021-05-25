package cmd

import (
	"os"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/cobra"
)

var app = ""

// deployCmd represents the "porter deploy" base command when called
// without any subcommands
var deployCmd = &cobra.Command{
	Use:   "app deploy",
	Short: "Builds and deploys a specified application given by the --app flag.",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deploy)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(deployCmd)

	deployCmd.PersistentFlags().StringVar(
		&app,
		"app",
		"",
		"Application in the Porter dashboard",
	)
}

func deploy(_ *api.AuthCheckResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Println("Deploying app:", app)

	return nil
}

// deployInit first reads the release given by the --app or the --job flag. It then
// configures docker with the registries linked to the project.
func deployInit(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	return dockerConfig(resp, client, args)
}

// deploySetEnv reads the build environment variables from a release and sets them using
// os.SetEnv
// func deploySetBuildEnv() error {

// }

// deployBuild uses the configuration stored in the release to
// func deployBuild()
