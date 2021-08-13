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

// var connectActionsCmd = &cobra.Command{
// 	Use:   "actions",
// 	Short: "Adds Github Actions to a project",
// 	Run: func(cmd *cobra.Command, args []string) {
// 		err := checkLoginAndRun(args, runConnectActions)

// 		if err != nil {
// 			os.Exit(1)
// 		}
// 	},
// }

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

var connectHRCmd = &cobra.Command{
	Use:     "helmrepo",
	Aliases: []string{"helm", "helmrepos"},
	Short:   "Adds a Helm repository to a project",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runConnectHelmRepoBasic)

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

	// connectCmd.AddCommand(connectActionsCmd)
	connectCmd.AddCommand(connectECRCmd)
	connectCmd.AddCommand(connectRegistryCmd)
	connectCmd.AddCommand(connectDockerhubCmd)
	connectCmd.AddCommand(connectGCRCmd)
	connectCmd.AddCommand(connectDOCRCmd)
	connectCmd.AddCommand(connectHRCmd)
}

func runConnectKubeconfig(_ *api.AuthCheckResponse, client *api.Client, _ []string) error {
	isLocal := false

	if config.Driver == "local" {
		isLocal = true
	}

	id, err := connect.Kubeconfig(
		client,
		kubeconfigPath,
		*contexts,
		config.Project,
		isLocal,
	)

	if err != nil {
		return err
	}

	return config.SetCluster(id)
}

func runConnectECR(_ *api.AuthCheckResponse, client *api.Client, _ []string) error {
	regID, err := connect.ECR(
		client,
		config.Project,
	)

	if err != nil {
		return err
	}

	return config.SetRegistry(regID)
}

func runConnectGCR(_ *api.AuthCheckResponse, client *api.Client, _ []string) error {
	regID, err := connect.GCR(
		client,
		config.Project,
	)

	if err != nil {
		return err
	}

	return config.SetRegistry(regID)
}

func runConnectDOCR(_ *api.AuthCheckResponse, client *api.Client, _ []string) error {
	regID, err := connect.DOCR(
		client,
		config.Project,
	)

	if err != nil {
		return err
	}

	return config.SetRegistry(regID)
}

func runConnectDockerhub(_ *api.AuthCheckResponse, client *api.Client, _ []string) error {
	regID, err := connect.Dockerhub(
		client,
		config.Project,
	)

	if err != nil {
		return err
	}

	return config.SetRegistry(regID)
}

func runConnectRegistry(_ *api.AuthCheckResponse, client *api.Client, _ []string) error {
	regID, err := connect.Registry(
		client,
		config.Project,
	)

	if err != nil {
		return err
	}

	return config.SetRegistry(regID)
}

func runConnectHelmRepoBasic(_ *api.AuthCheckResponse, client *api.Client, _ []string) error {
	hrID, err := connect.Helm(
		client,
		config.Project,
	)

	if err != nil {
		return err
	}

	return config.SetHelmRepo(hrID)
}

// func runConnectActions(_ *api.AuthCheckResponse, client *api.Client, _ []string) error {
// 	return connect.Actions(
// 		client,
// 		config.Project,
// 	)
// }
