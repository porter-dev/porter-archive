package commands

import (
	"context"
	"os"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/connect"
	"github.com/spf13/cobra"
)

var (
	kubeconfigPath string
	print          *bool
	contexts       *[]string
)

func registerCommand_Connect(cliConf config.CLIConfig) *cobra.Command {
	connectCmd := &cobra.Command{
		Use:   "connect",
		Short: "Commands that connect to external clusters and providers",
	}

	connectKubeconfigCmd := &cobra.Command{
		Use:   "kubeconfig",
		Short: "Uses the local kubeconfig to add a cluster",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, runConnectKubeconfig)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	connectECRCmd := &cobra.Command{
		Use:   "ecr",
		Short: "Adds an ECR instance to a project",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, runConnectECR)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	connectDockerhubCmd := &cobra.Command{
		Use:   "dockerhub",
		Short: "Adds a Docker Hub registry integration to a project",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, runConnectDockerhub)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	connectRegistryCmd := &cobra.Command{
		Use:   "registry",
		Short: "Adds a custom image registry to a project",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, runConnectRegistry)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	connectHelmRepoCmd := &cobra.Command{
		Use:   "helm",
		Short: "Adds a custom Helm registry to a project",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, runConnectHelmRepo)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	connectGCRCmd := &cobra.Command{
		Use:   "gcr",
		Short: "Adds a GCR instance to a project",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, runConnectGCR)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	connectGARCmd := &cobra.Command{
		Use:   "gar",
		Short: "Adds a GAR instance to a project",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, runConnectGAR)
			if err != nil {
				os.Exit(1)
			}
			cmd.Context()
		},
	}

	connectDOCRCmd := &cobra.Command{
		Use:   "docr",
		Short: "Adds a DOCR instance to a project",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, runConnectDOCR)
			if err != nil {
				os.Exit(1)
			}
		},
	}

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
	return connectCmd
}

func runConnectKubeconfig(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, _ []string) error {
	isLocal := false

	if cliConf.Driver == "local" {
		isLocal = true
	}

	id, err := connect.Kubeconfig(
		ctx,
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

func runConnectECR(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, _ []string) error {
	regID, err := connect.ECR(
		ctx,
		client,
		cliConf.Project,
	)
	if err != nil {
		return err
	}

	return cliConf.SetRegistry(regID)
}

func runConnectGCR(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, _ []string) error {
	regID, err := connect.GCR(
		ctx,
		client,
		cliConf.Project,
	)
	if err != nil {
		return err
	}

	return cliConf.SetRegistry(regID)
}

func runConnectGAR(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, _ []string) error {
	regID, err := connect.GAR(
		ctx,
		client,
		cliConf.Project,
	)
	if err != nil {
		return err
	}

	return cliConf.SetRegistry(regID)
}

func runConnectDOCR(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, _ []string) error {
	regID, err := connect.DOCR(
		ctx,
		client,
		cliConf.Project,
	)
	if err != nil {
		return err
	}

	return cliConf.SetRegistry(regID)
}

func runConnectDockerhub(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, _ []string) error {
	regID, err := connect.Dockerhub(
		ctx,
		client,
		cliConf.Project,
	)
	if err != nil {
		return err
	}

	return cliConf.SetRegistry(regID)
}

func runConnectRegistry(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, _ []string) error {
	regID, err := connect.Registry(
		ctx,
		client,
		cliConf.Project,
	)
	if err != nil {
		return err
	}

	return cliConf.SetRegistry(regID)
}

func runConnectHelmRepo(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, _ []string) error {
	hrID, err := connect.HelmRepo(
		ctx,
		client,
		cliConf.Project,
	)
	if err != nil {
		return err
	}

	return cliConf.SetHelmRepo(hrID)
}
