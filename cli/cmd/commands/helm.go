package commands

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/spf13/cobra"
)

func registerCommand_Helm(cliConf config.CLIConfig) *cobra.Command {
	depMsg := `This command is no longer available. Please consult documentation of the respective cloud provider to get access to the kubeconfig of the cluster. 
	Note that any change made directly on the kubernetes cluster under the hood can degrade the performance and reliability of the cluster, and Porter will 
	automatically reconcile any changes that pose a threat to the uptime of the cluster to its original state. Porter is not responsible for the issues that 
	arise due to the change implemented directly on the Kubernetes cluster via kubectl.`

	helmCmd := &cobra.Command{
		Use:        "helm",
		Short:      "Use helm to interact with a Porter cluster",
		Deprecated: depMsg,
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, runHelm)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	return helmCmd
}

func runHelm(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	// this will never error because it just ran
	user, _ := client.AuthCheck(ctx)
	if !strings.HasSuffix(user.Email, "@porter.run") {
		return fmt.Errorf("Forbidden")
	}

	_, err := exec.LookPath("helm")
	if err != nil {
		return fmt.Errorf("error finding helm: %w", err)
	}

	tmpFile, err := downloadTempKubeconfig(ctx, client, cliConf)
	if err != nil {
		return err
	}

	defer func() {
		os.Remove(tmpFile)
	}()

	os.Setenv("KUBECONFIG", tmpFile)

	execCommand := exec.Command("helm", args...)

	execCommand.Stdin = os.Stdin
	execCommand.Stdout = os.Stdout
	execCommand.Stderr = os.Stderr

	err = execCommand.Run()
	if err != nil {
		return fmt.Errorf("error running helm: %w", err)
	}

	return nil
}
