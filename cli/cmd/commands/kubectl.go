package commands

import (
	"context"
	"fmt"
	"os"
	"os/exec"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/spf13/cobra"
)

func registerCommand_Kubectl(cliConf config.CLIConfig) *cobra.Command {
	kubectlCmd := &cobra.Command{
		Use:   "kubectl",
		Short: "Use kubectl to interact with a Porter cluster",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, runKubectl)
			if err != nil {
				os.Exit(1)
			}
		},
	}
	var printKubeconfig bool
	kubectlCmd.Flags().BoolVar(&printKubeconfig, "print-kubeconfig", false, "Print an authenticated kubeconfig to the console with a 15 minute expiry")
	return kubectlCmd
}

func runKubectl(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	_, err := exec.LookPath("kubectl")
	if err != nil {
		return fmt.Errorf("error finding kubectl: %w", err)
	}

	printKubeconfig, err := cmd.Flags().GetBool("print-kubeconfig")
	if err != nil {
		return fmt.Errorf("error when retrieving print-kubeconfig flag")
	}

	tmpFile, err := downloadTempKubeconfig(ctx, client, cliConf)
	if err != nil {
		return err
	}

	defer func() {
		os.Remove(tmpFile)
	}()

	if printKubeconfig {
		kc, err := os.ReadFile(tmpFile) //nolint:gosec
		if err != nil {
			return fmt.Errorf("erro reading downloaded kubeconfig for printing: %w", err)
		}
		fmt.Println(string(kc))
		return nil
	}

	err = os.Setenv("KUBECONFIG", tmpFile)
	if err != nil {
		return fmt.Errorf("unable to set KUBECONFIG env var: %w", err)
	}

	execCommand := exec.Command("kubectl", args...)

	execCommand.Stdin = os.Stdin
	execCommand.Stdout = os.Stdout
	execCommand.Stderr = os.Stderr

	err = execCommand.Run()
	if err != nil {
		return fmt.Errorf("error running helm: %w", err)
	}

	return nil
}

func downloadTempKubeconfig(ctx context.Context, client api.Client, cliConf config.CLIConfig) (string, error) {
	tmpFile, err := os.CreateTemp("", "porter_kubeconfig_*.yaml")
	if err != nil {
		return "", fmt.Errorf("error creating temp file for kubeconfig: %w", err)
	}

	defer tmpFile.Close()

	resp, err := client.GetKubeconfig(ctx, cliConf.Project, cliConf.Cluster, cliConf.Kubeconfig)
	if err != nil {
		return "", fmt.Errorf("error fetching kubeconfig for cluster: %w", err)
	}

	_, err = tmpFile.Write(resp.Kubeconfig)

	if err != nil {
		return "", fmt.Errorf("error writing kubeconfig to temp file: %w", err)
	}

	return tmpFile.Name(), nil
}
