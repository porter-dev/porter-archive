package cmd

import (
	"fmt"
	"os"
	"os/exec"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/spf13/cobra"
)

var compareRevisionsCmd = &cobra.Command{
	Use:   "compare-revisions",
	Short: "Compare two revisions of a release. Arguments must be in the form: porter compare-revisions <release-name> <base-revision-number> <changed-revision-number>",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runCompareRevisions)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(compareRevisionsCmd)
}

func runCompareRevisions(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	_, err := exec.LookPath("helm")

	if err != nil {
		return fmt.Errorf("error finding helm: %w", err)
	}

	_, err = exec.LookPath("colordiff")

	if err != nil {
		return fmt.Errorf("error finding colordiff: %w", err)
	}

	tmpFile, err := downloadTempKubeconfig(client)

	if err != nil {
		return err
	}

	defer func() {
		os.Remove(tmpFile)
	}()

	if len(args) != 3 {
		return fmt.Errorf("arguments must be in the form: porter compare-revisions <release-name> <base-revision-number> <changed-revision-number>")
	}

	os.Setenv("KUBECONFIG", tmpFile)

	baseConfig, err := exec.Command("helm", []string{"get", "values", args[0], "--revision", args[1]}...).Output()

	if err != nil {
		return fmt.Errorf("error retrieving revision %s for release with name %s: %w", args[0], args[1], err)
	}

	changedConfig, err := exec.Command("helm", []string{"get", "values", args[0], "--revision", args[2]}...).Output()

	if err != nil {
		return fmt.Errorf("error retrieving revision %s for release with name %s: %w", args[0], args[2], err)
	}

	baseTmpFile, err := createTempFile("base-config", baseConfig)
	if err != nil {
		return fmt.Errorf("error creating base temp file: %w", err)
	}

	defer baseTmpFile.Close()
	defer os.Remove(baseTmpFile.Name())

	changedTmpFile, err := createTempFile("changed-config", changedConfig)
	if err != nil {
		return fmt.Errorf("error creating changed temp file: %w", err)
	}

	defer changedTmpFile.Close()
	defer os.Remove(changedTmpFile.Name())

	cmd := exec.Command("colordiff", baseTmpFile.Name(), changedTmpFile.Name(), "-y")

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err = cmd.Run()

	// colordiff returns exit status 1 if there are differences
	if err != nil && err.Error() != "exit status 1" {
		return fmt.Errorf("error running diff: %w", err)
	}

	return nil
}

func createTempFile(prefix string, config []byte) (*os.File, error) {
	tmpFile, err := os.CreateTemp("", prefix)
	if err != nil {
		return nil, fmt.Errorf("error creating temp file: %w", err)
	}

	if err := os.WriteFile(tmpFile.Name(), config, 0644); err != nil {
		return nil, fmt.Errorf("error writing to temp file: %w", err)
	}

	return tmpFile, nil
}
