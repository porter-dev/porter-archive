package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/porter/cli/cmd/deploy/wait"
	"github.com/spf13/cobra"
)

var jobCmd = &cobra.Command{
	Use: "job",
}

var batchImageUpdateCmd = &cobra.Command{
	Use:   "update-images",
	Short: "Updates the image tag of all jobs in a namespace which use a specific image.",
	Long: fmt.Sprintf(`
%s

Updates the image tag of all jobs in a namespace which use a specific image. Note that for all
jobs with version <= v0.4.0, this will trigger a new run of a manual job. However, for versions
>= v0.5.0, this will not create a new run of the job.

Example commands:

  %s

This command is namespace-scoped and uses the default namespace. To specify a different namespace,
use the --namespace flag:

  %s
`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter job update-images\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter job update-images --image-repo-uri my-image.registry.io --tag newtag"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter job update-images --namespace custom-namespace --image-repo-uri my-image.registry.io --tag newtag"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, batchImageUpdate)
		if err != nil {
			os.Exit(1)
		}
	},
}

var waitCmd = &cobra.Command{
	Use:   "wait",
	Short: "Waits for a job to complete.",
	Long: fmt.Sprintf(`
%s

Waits for a job with a given name and namespace to complete a run. If the job completes successfully,
this command exits with exit code 0. Otherwise, this command exits with exit code 1.

Example commands:

  %s

This command is namespace-scoped and uses the default namespace. To specify a different namespace,
use the --namespace flag:

  %s
`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter job wait\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter job wait --name job-example"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter job wait --name job-example --namespace custom-namespace"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, waitForJob)
		if err != nil {
			os.Exit(1)
		}
	},
}

var runJobCmd = &cobra.Command{
	Use:   "run",
	Short: "Manually runs a job and waits for it to complete.",
	Long: fmt.Sprintf(`
%s

Manually runs a job and waits for it to complete a run. If the job completes successfully,
this command exits with exit code 0. Otherwise, this command exits with exit code 1.

Example commands:

  %s

This command is namespace-scoped and uses the default namespace. To specify a different namespace,
use the --namespace flag:

  %s
`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter job run\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter job run --name job-example"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter job run --name job-example --namespace custom-namespace"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, runJob)
		if err != nil {
			os.Exit(1)
		}
	},
}

var imageRepoURI string

func init() {
	rootCmd.AddCommand(jobCmd)
	jobCmd.AddCommand(batchImageUpdateCmd)
	jobCmd.AddCommand(waitCmd)
	jobCmd.AddCommand(runJobCmd)

	batchImageUpdateCmd.PersistentFlags().StringVar(
		&tag,
		"tag",
		"",
		"The new image tag to use.",
	)

	batchImageUpdateCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"",
		"The namespace of the jobs.",
	)

	batchImageUpdateCmd.PersistentFlags().StringVarP(
		&imageRepoURI,
		"image-repo-uri",
		"i",
		"",
		"Image repo uri",
	)

	batchImageUpdateCmd.MarkPersistentFlagRequired("image-repo-uri")
	batchImageUpdateCmd.MarkPersistentFlagRequired("tag")

	waitCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"",
		"The namespace of the jobs.",
	)

	waitCmd.PersistentFlags().StringVar(
		&name,
		"name",
		"",
		"The name of the jobs.",
	)

	waitCmd.MarkPersistentFlagRequired("name")

	runJobCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"",
		"The namespace of the job.",
	)

	runJobCmd.PersistentFlags().StringVar(
		&name,
		"name",
		"",
		"The name of the job.",
	)

	runJobCmd.MarkPersistentFlagRequired("name")
}

func batchImageUpdate(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Println("Updating all jobs which use the image:", imageRepoURI)

	return client.UpdateBatchImage(
		context.TODO(),
		cliConf.Project,
		cliConf.Cluster,
		namespace,
		&types.UpdateImageBatchRequest{
			ImageRepoURI: imageRepoURI,
			Tag:          tag,
		},
	)
}

// waits for a job with a given name/namespace
func waitForJob(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	return wait.WaitForJob(client, &wait.WaitOpts{
		ProjectID: cliConf.Project,
		ClusterID: cliConf.Cluster,
		Namespace: namespace,
		Name:      name,
	})
}

func runJob(authRes *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Printf("Running job %s in namespace %s\n", name, namespace)

	waitForSuccessfulDeploy = true

	updateAgent := &deploy.DeployAgent{
		App:    name,
		Client: client,
		Opts: &deploy.DeployOpts{
			SharedOpts: &deploy.SharedOpts{
				ProjectID: cliConf.Project,
				ClusterID: cliConf.Cluster,
				Namespace: namespace,
			},
		},
	}

	err := updateAgent.UpdateImageAndValues(map[string]interface{}{
		"paused": false,
	})
	if err != nil {
		return fmt.Errorf("error running job: %w", err)
	}

	err = waitForJob(authRes, client, args)

	if err != nil {
		return fmt.Errorf("error waiting for job to complete: %w", err)
	}

	return nil
}
