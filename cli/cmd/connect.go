package cmd

import (
	"os"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
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

var connectDockerhubCmd = &cobra.Command{
	Use:   "dockerhub",
	Short: "Adds a Docker Hub registry integration to a project",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runConnectDockerhub)

		if err != nil {
			os.Exit(1)
		}
	},
}

var connectRegistryCmd = &cobra.Command{
	Use:   "registry",
	Short: "Adds a custom image registry to a project",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runConnectRegistry)

		if err != nil {
			os.Exit(1)
		}
	},
}

var connectHelmRepoCmd = &cobra.Command{
	Use:   "helm",
	Short: "Adds a custom Helm registry to a project",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runConnectHelmRepo)

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

var connectGARCmd = &cobra.Command{
	Use:   "gar",
	Short: "Adds a GAR instance to a project",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runConnectGAR)

		if err != nil {
			os.Exit(1)
		}
	},
}

var connectDOCRCmd = &cobra.Command{
	Use:   "docr",
	Short: "Adds a DOCR instance to a project",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runConnectDOCR)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(connectCmd)

	connectCmd.AddCommand(connectKubeconfigCmd)

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
	connectCmd.AddCommand(connectRegistryCmd)
	connectCmd.AddCommand(connectDockerhubCmd)
	connectCmd.AddCommand(connectGCRCmd)
	connectCmd.AddCommand(connectGARCmd)
	connectCmd.AddCommand(connectDOCRCmd)
	connectCmd.AddCommand(connectHelmRepoCmd)
}

func runConnectKubeconfig(_ *types.GetAuthenticatedUserResponse, client *api.Client, _ []string) error {
	isLocal := false

	if cliConf.Driver == "local" {
		isLocal = true
	}

	id, err := connect.Kubeconfig(
		client,
		kubeconfigPath,
		*contexts,
		cliConf.Project,
		isLocal,
	)

	if err != nil {
		return err
	}

	return cliConf.SetCluster(id)
}

func runConnectECR(_ *types.GetAuthenticatedUserResponse, client *api.Client, _ []string) error {
	regID, err := connect.ECR(
		client,
		cliConf.Project,
	)

	if err != nil {
		return err
	}

	return cliConf.SetRegistry(regID)
}

func runConnectGCR(_ *types.GetAuthenticatedUserResponse, client *api.Client, _ []string) error {
	regID, err := connect.GCR(
		client,
		cliConf.Project,
	)

	if err != nil {
		return err
	}

	return cliConf.SetRegistry(regID)
}

func runConnectGAR(_ *types.GetAuthenticatedUserResponse, client *api.Client, _ []string) error {
	regID, err := connect.GAR(
		client,
		cliConf.Project,
	)

	if err != nil {
		return err
	}

	return cliConf.SetRegistry(regID)
}

func runConnectDOCR(_ *types.GetAuthenticatedUserResponse, client *api.Client, _ []string) error {
	regID, err := connect.DOCR(
		client,
		cliConf.Project,
	)

	if err != nil {
		return err
	}

	return cliConf.SetRegistry(regID)
}

func runConnectDockerhub(_ *types.GetAuthenticatedUserResponse, client *api.Client, _ []string) error {
	regID, err := connect.Dockerhub(
		client,
		cliConf.Project,
	)

	if err != nil {
		return err
	}

	return cliConf.SetRegistry(regID)
}

func runConnectRegistry(_ *types.GetAuthenticatedUserResponse, client *api.Client, _ []string) error {
	regID, err := connect.Registry(
		client,
		cliConf.Project,
	)

	if err != nil {
		return err
	}

	return cliConf.SetRegistry(regID)
}

func runConnectHelmRepo(_ *types.GetAuthenticatedUserResponse, client *api.Client, _ []string) error {
	hrID, err := connect.HelmRepo(
		client,
		cliConf.Project,
	)

	if err != nil {
		return err
	}

	return cliConf.SetHelmRepo(hrID)
}
