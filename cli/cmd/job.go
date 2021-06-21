package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/cobra"
)

var batchImageUpdateCmd = &cobra.Command{
	Use:   "job update-images",
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

var imageRepoURI string

func init() {
	rootCmd.AddCommand(batchImageUpdateCmd)

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
}

func batchImageUpdate(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Println("Updating all jobs which use the image:", imageRepoURI)

	return client.UpdateBatchImage(
		context.TODO(),
		config.Project,
		config.Cluster,
		namespace,
		&api.UpdateBatchImageRequest{
			ImageRepoURI: imageRepoURI,
			Tag:          tag,
		},
	)
}
