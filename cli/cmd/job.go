package cmd

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/spf13/cobra"
	v1 "k8s.io/api/batch/v1"
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

var imageRepoURI string

func init() {
	rootCmd.AddCommand(jobCmd)
	jobCmd.AddCommand(batchImageUpdateCmd)
	jobCmd.AddCommand(waitCmd)

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
}

func batchImageUpdate(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Println("Updating all jobs which use the image:", imageRepoURI)

	return client.UpdateBatchImage(
		context.TODO(),
		config.Project,
		config.Cluster,
		namespace,
		&types.UpdateImageBatchRequest{
			ImageRepoURI: imageRepoURI,
			Tag:          tag,
		},
	)
}

// waits for a job with a given name/namespace
func waitForJob(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	// get the job release
	jobRelease, err := client.GetRelease(context.Background(), config.Project, config.Cluster, namespace, name)

	if err != nil {
		return err
	}

	// make sure the job chart has a manual job running
	pausedVal, ok := jobRelease.Release.Config["paused"]
	pausedErr := fmt.Errorf("this job template is not currently running a manual job")

	if !ok {
		return pausedErr
	}

	if pausedValBool, ok := pausedVal.(bool); ok && pausedValBool {
		return pausedErr
	}

	// if no job exists with the given revision, wait up to 5 minutes
	timeWait := time.Now().Add(5 * time.Minute)

	for timeNow := time.Now(); timeNow.Before(timeWait); {
		// get the jobs for that job chart
		jobs, err := client.GetJobs(context.Background(), config.Project, config.Cluster, namespace, name)

		if err != nil {
			return err
		}

		job := getJobMatchingRevision(uint(jobRelease.Release.Version), jobs)

		if job == nil {
			time.Sleep(10 * time.Second)
			continue
		}

		// once job is running, wait for status to be completed, or failed
		// if failed, exit with non-zero exit code
		if job.Status.Failed > 0 {
			return fmt.Errorf("job failed")
		}

		if job.Status.Succeeded > 0 {
			return nil
		}

		// otherwise, return no error
		time.Sleep(10 * time.Second)
		continue
	}

	return fmt.Errorf("timed out waiting for job")
}

func getJobMatchingRevision(revision uint, jobs []v1.Job) *v1.Job {
	for _, job := range jobs {
		revisionLabel, revisionLabelExists := job.Labels["helm.sh/revision"]

		if !revisionLabelExists {
			continue
		}

		jobRevision, err := strconv.ParseUint(revisionLabel, 10, 64)

		if err != nil {
			continue
		}

		if uint(jobRevision) == revision {
			return &job
		}
	}

	return nil
}
