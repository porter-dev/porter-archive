package cmd

import (
	"context"
	"fmt"
	"os"
	"strconv"

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
  PORTER_GIT_INSTALLATION_ID  The Github installation ID that this deployment is associated with.
  PORTER_NAMESPACE            The namespace associated with the deployment.
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

func init() {
	rootCmd.AddCommand(deleteCmd)
}

func delete(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	projectID := config.Project

	if projectID == 0 {
		return fmt.Errorf("project id must be set")
	}

	clusterID := config.Cluster

	if clusterID == 0 {
		return fmt.Errorf("cluster id must be set")
	}

	deplNamespace := os.Getenv("PORTER_NAMESPACE")

	if deplNamespace == "" {
		return fmt.Errorf("namespace must be set by PORTER_NAMESPACE")
	}

	var ghID uint

	if ghIDStr := os.Getenv("PORTER_GIT_INSTALLATION_ID"); ghIDStr != "" {
		ghIDInt, err := strconv.Atoi(ghIDStr)

		if err != nil {
			return err
		}

		ghID = uint(ghIDInt)
	} else if ghIDStr == "" {
		return fmt.Errorf("Git installation ID must be defined, set by PORTER_GIT_INSTALLATION_ID")
	}

	var gitRepoName string
	var gitRepoOwner string

	if repoName := os.Getenv("PORTER_REPO_NAME"); repoName != "" {
		gitRepoName = repoName
	} else if repoName == "" {
		return fmt.Errorf("Repo name must be defined, set by PORTER_REPO_NAME")
	}

	if repoOwner := os.Getenv("PORTER_REPO_OWNER"); repoOwner != "" {
		gitRepoOwner = repoOwner
	} else if repoOwner == "" {
		return fmt.Errorf("Repo owner must be defined, set by PORTER_REPO_OWNER")
	}

	return client.DeleteDeployment(
		context.Background(),
		projectID, ghID, clusterID,
		gitRepoOwner, gitRepoName,
		&types.DeleteDeploymentRequest{
			Namespace: deplNamespace,
		},
	)
}
