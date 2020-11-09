package cmd

import (
	"os"

	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/connect"
	"github.com/spf13/cobra"
)

var (
	kubeconfigPath string
	print          *bool
	contexts       *[]string
)

var connectCmd = &cobra.Command{
	Use:   "connect",
	Short: "Commands that connect to external clusters and providers",
}

var connectKubeconfigCmd = &cobra.Command{
	Use:   "kubeconfig",
	Short: "Uses the local kubeconfig to connect to a cluster",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runConnect)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(connectCmd)

	connectCmd.AddCommand(connectKubeconfigCmd)

	connectCmd.PersistentFlags().StringVar(
		&host,
		"host",
		getHost(),
		"host url of Porter instance",
	)

	projectID = *connectCmd.PersistentFlags().UintP(
		"project-id",
		"p",
		getProjectID(),
		"project id to use",
	)

	connectKubeconfigCmd.PersistentFlags().StringVarP(
		&kubeconfigPath,
		"kubeconfig",
		"k",
		"",
		"path to kubeconfig",
	)

	contexts = connectKubeconfigCmd.PersistentFlags().StringArray(
		"contexts",
		nil,
		"the list of contexts to connect (defaults to the current context)",
	)
}

func runConnect(_ *api.AuthCheckResponse, client *api.Client, _ []string) error {
	return connect.Kubeconfig(
		client,
		kubeconfigPath,
		*contexts,
		getProjectID(),
	)
}
