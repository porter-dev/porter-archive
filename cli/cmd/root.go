package cmd

import (
	"os"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/cobra"
	"k8s.io/client-go/util/homedir"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "porter",
	Short: "Porter is a dashboard for managing Kubernetes clusters.",
	Long:  `Porter is a tool for creating, versioning, and updating Kubernetes deployments using a visual dashboard. For more information, visit github.com/porter-dev/porter`,
}

var home = homedir.HomeDir()

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	Setup()

	rootCmd.PersistentFlags().AddFlagSet(defaultFlagSet)

	if err := rootCmd.Execute(); err != nil {
		color.New(color.FgRed).Println(err)
		os.Exit(1)
	}
}

func Setup() {
	InitAndLoadConfig()
}

func GetAPIClient(config *CLIConfig) *api.Client {
	if token := config.Token; token != "" {
		return api.NewClientWithToken(config.Host+"/api", token)
	}

	return api.NewClient(config.Host+"/api", "cookie.json")
}
