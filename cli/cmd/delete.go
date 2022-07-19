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
	`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter delete\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter delete"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deleteDeployment)

		if err != nil {
			os.Exit(1)
		}
	},
}

// deleteAppsCmd represents the "porter delete apps" subcommand
var deleteAppsCmd = &cobra.Command{
	Use:     "apps",
	Aliases: []string{"app", "applications", "application"},
	Short:   "Deletes an existing app",
	Args:    cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deleteApp)

		if err != nil {
			os.Exit(1)
		}
	},
}

// deleteJobsCmd represents the "porter delete jobs" subcommand
var deleteJobsCmd = &cobra.Command{
	Use:     "jobs",
	Aliases: []string{"job"},
	Short:   "Deletes an existing job",
	Args:    cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deleteJob)

		if err != nil {
			os.Exit(1)
		}
	},
}

// deleteAddonsCmd represents the "porter delete addons" subcommand
var deleteAddonsCmd = &cobra.Command{
	Use:     "addons",
	Aliases: []string{"addon"},
	Short:   "Deletes an existing addon",
	Args:    cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deleteAddon)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	deleteCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"Namespace of the application",
	)

	deleteCmd.AddCommand(deleteAppsCmd)
	deleteCmd.AddCommand(deleteJobsCmd)
	deleteCmd.AddCommand(deleteAddonsCmd)

	rootCmd.AddCommand(deleteCmd)
}

func deleteDeployment(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	projectID := cliConf.Project

	if projectID == 0 {
		return fmt.Errorf("project id must be set")
	}

	clusterID := cliConf.Cluster

	if clusterID == 0 {
		return fmt.Errorf("cluster id must be set")
	}

	var deploymentID uint

	if deplIDStr := os.Getenv("PORTER_DEPLOYMENT_ID"); deplIDStr != "" {
		deplID, err := strconv.ParseUint(deplIDStr, 10, 32)

		if err != nil {
			return fmt.Errorf("error parsing deployment ID: %s", deplIDStr)
		}

		deploymentID = uint(deplID)
	} else {
		return fmt.Errorf("Deployment ID must be defined, set by PORTER_DEPLOYMENT_ID")
	}

	return client.DeleteDeployment(
		context.Background(), projectID, clusterID, deploymentID,
	)
}

func deleteApp(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	name := args[0]

	resp, err := client.GetRelease(
		context.Background(), cliConf.Project, cliConf.Cluster, namespace, name,
	)

	if err != nil {
		return err
	}

	rel := *resp

	if rel.Chart.Name() != "web" && rel.Chart.Name() != "worker" {
		return fmt.Errorf("no app found with name: %s", name)
	}

	color.New(color.FgBlue).Printf("Deleting app: %s\n", name)

	err = client.DeleteRelease(
		context.Background(), cliConf.Project, cliConf.Cluster, namespace, name,
	)

	if err != nil {
		return err
	}

	return nil
}

func deleteJob(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	name := args[0]

	resp, err := client.GetRelease(
		context.Background(), cliConf.Project, cliConf.Cluster, namespace, name,
	)

	if err != nil {
		return err
	}

	rel := *resp

	if rel.Chart.Name() != "job" {
		return fmt.Errorf("no job found with name: %s", name)
	}

	color.New(color.FgBlue).Printf("Deleting job: %s\n", name)

	err = client.DeleteRelease(
		context.Background(), cliConf.Project, cliConf.Cluster, namespace, name,
	)

	if err != nil {
		return err
	}

	return nil
}

func deleteAddon(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	name := args[0]

	resp, err := client.GetRelease(
		context.Background(), cliConf.Project, cliConf.Cluster, namespace, name,
	)

	if err != nil {
		return err
	}

	rel := *resp

	if rel.Chart.Name() == "web" || rel.Chart.Name() == "worker" || rel.Chart.Name() == "job" {
		return fmt.Errorf("no addon found with name: %s", name)
	}

	color.New(color.FgBlue).Printf("Deleting addon: %s\n", name)

	err = client.DeleteRelease(
		context.Background(), cliConf.Project, cliConf.Cluster, namespace, name,
	)

	if err != nil {
		return err
	}

	return nil
}
