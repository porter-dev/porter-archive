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

func registerCommand_Kubectl(cliConf config.CLIConfig) *cobra.Command {
	depMsg := `This command is no longer available. Please consult documentation of the respective cloud provider to get access to the kubeconfig of the cluster. 
	Note that any change made directly on the kubernetes cluster under the hood can degrade the performance and reliability of the cluster, and Porter will 
	automatically reconcile any changes that pose a threat to the uptime of the cluster to its original state. Porter is not responsible for the issues that 
	arise due to the change implemented directly on the Kubernetes cluster via kubectl.`

	kubectlCmd := &cobra.Command{
		Use:        "kubectl",
		Short:      "Use kubectl to interact with a Porter cluster",
		Deprecated: depMsg,
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
	// this will never error because it just ran
	user, _ := client.AuthCheck(ctx)
	if !strings.HasSuffix(user.Email, "@porter.run") {
		return fmt.Errorf("Forbidden")
	}

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
		return fmt.Errorf("error running kubectl: %w", err)
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
