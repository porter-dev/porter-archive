package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/spf13/cobra"
)

// deleteCmd represents the "porter delete" base command
var deleteCmd = &cobra.Command{
	Use:   "delete",
	Short: "Deletes a deployment",
	Long: fmt.Sprintf(`
%s

Destroys a deployment, which is read based on env variables.

  %s

The following are the environment variables that can be used to set certain values while
deleting a configuration:
  PORTER_CLUSTER              Cluster ID that contains the project
  PORTER_PROJECT              Project ID that contains the application
	`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter delete\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter delete"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, delete)

		if err != nil {
			os.Exit(1)
		}
	},
}

// deleteAppsCmd represents the "porter delete apps" subcommand
var deleteAppsCmd = &cobra.Command{
	Use:     "apps",
	Aliases: []string{"app"},
	Short:   "Deletes an existing app",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deleteApp)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	deleteCmd.AddCommand(deleteAppsCmd)

	rootCmd.AddCommand(deleteCmd)
}

func delete(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	projectID := cliConf.Project

	if projectID == 0 {
		return fmt.Errorf("project id must be set")
	}

	clusterID := cliConf.Cluster

	if clusterID == 0 {
		return fmt.Errorf("cluster id must be set")
	}

	var environmentID string
	var gitRepoName string
	var gitRepoOwner string
	var gitPRNumber string

	if envID := os.Getenv("PORTER_ENVIRONMENT_ID"); envID != "" {
		environmentID = envID
	} else {
		return fmt.Errorf("Environment ID must be defined, set by PORTER_ENVIRONMENT_ID")
	}

	if repoName := os.Getenv("PORTER_REPO_NAME"); repoName != "" {
		gitRepoName = repoName
	} else {
		return fmt.Errorf("Repo name must be defined, set by PORTER_REPO_NAME")
	}

	if repoOwner := os.Getenv("PORTER_REPO_OWNER"); repoOwner != "" {
		gitRepoOwner = repoOwner
	} else {
		return fmt.Errorf("Repo owner must be defined, set by PORTER_REPO_OWNER")
	}

	if prNumber := os.Getenv("PORTER_PR_NUMBER"); prNumber != "" {
		gitPRNumber = prNumber
	} else {
		return fmt.Errorf("Pull request number must be defined, set by PORTER_PR_NUMBER")
	}

	return client.DeleteDeployment(
		context.Background(), projectID, clusterID, environmentID,
		gitRepoOwner, gitRepoName, gitPRNumber,
	)
}

func deleteApp(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {

	return nil
}
