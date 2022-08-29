package cmd

import (
	"context"
	"fmt"
	"os"
	"os/exec"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/spf13/cobra"
)

var kubectlCmd = &cobra.Command{
	Use:   "kubectl",
	Short: "Use kubectl to interact with a Porter cluster",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runKubectl)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(kubectlCmd)
}

func runKubectl(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	_, err := exec.LookPath("kubectl")

	if err != nil {
		return fmt.Errorf("error finding kubectl: %w", err)
	}

	tmpFile, err := downloadTempKubeconfig(client)

	if err != nil {
		return err
	}

	defer func() {
		os.Remove(tmpFile)
	}()

	os.Setenv("KUBECONFIG", tmpFile)

	cmd := exec.Command("kubectl", args...)

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err = cmd.Run()

	if err != nil {
		return fmt.Errorf("error running helm: %w", err)
	}

	return nil
}

func downloadTempKubeconfig(client *api.Client) (string, error) {
	tmpFile, err := os.CreateTemp("", "porter_kubeconfig_*.yaml")

	if err != nil {
		return "", fmt.Errorf("error creating temp file for kubeconfig: %w", err)
	}

	defer tmpFile.Close()

	resp, err := client.GetKubeconfig(context.Background(), cliConf.Project, cliConf.Cluster, cliConf.Kubeconfig)

	if err != nil {
		return "", fmt.Errorf("error fetching kubeconfig for cluster: %w", err)
	}

	_, err = tmpFile.Write(resp.Kubeconfig)

	if err != nil {
		return "", fmt.Errorf("error writing kubeconfig to temp file: %w", err)
	}

	return tmpFile.Name(), nil
}
