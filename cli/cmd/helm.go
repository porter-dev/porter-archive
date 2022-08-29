package cmd

import (
	"fmt"
	"os"
	"os/exec"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/spf13/cobra"
)

var helmCmd = &cobra.Command{
	Use:   "helm",
	Short: "Use helm to interact with a Porter cluster",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runHelm)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(helmCmd)
}

func runHelm(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	_, err := exec.LookPath("helm")

	if err != nil {
		return fmt.Errorf("error finding helm: %w", err)
	}

	tmpFile, err := downloadTempKubeconfig(client)

	if err != nil {
		return err
	}

	defer func() {
		os.Remove(tmpFile)
	}()

	os.Setenv("KUBECONFIG", tmpFile)

	cmd := exec.Command("helm", args...)

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err = cmd.Run()

	if err != nil {
		return fmt.Errorf("error running helm: %w", err)
	}

	return nil
}
