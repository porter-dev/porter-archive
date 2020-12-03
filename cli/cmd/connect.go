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
	Short: "Uses the local kubeconfig to add a cluster",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runConnectKubeconfig)

		if err != nil {
			os.Exit(1)
		}
	},
}

var connectECRCmd = &cobra.Command{
	Use:   "ecr",
	Short: "Adds an ECR instance to a project",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runConnectECR)

		if err != nil {
			os.Exit(1)
		}
	},
}

var connectGCRCmd = &cobra.Command{
	Use:   "gcr",
	Short: "Adds a GCR instance to a project",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runConnectGCR)

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
		"context",
		nil,
		"the context to connect (defaults to the current context)",
	)

	connectCmd.AddCommand(connectECRCmd)
	connectCmd.AddCommand(connectGCRCmd)
}

func runConnectKubeconfig(_ *api.AuthCheckResponse, client *api.Client, _ []string) error {
	isLocal := false

	if getDriver() == "local" {
		isLocal = true
	}

	id, err := connect.Kubeconfig(
		client,
		kubeconfigPath,
		*contexts,
		getProjectID(),
		isLocal,
	)

	if err != nil {
		return err
	}

	return setCluster(id)
}

func runConnectECR(_ *api.AuthCheckResponse, client *api.Client, _ []string) error {
	regID, err := connect.ECR(
		client,
		getProjectID(),
	)

	if err != nil {
		return err
	}

	return setRegistry(regID)
}

func runConnectGCR(_ *api.AuthCheckResponse, client *api.Client, _ []string) error {
	regID, err := connect.GCR(
		client,
		getProjectID(),
	)

	if err != nil {
		return err
	}

	return setRegistry(regID)
}
