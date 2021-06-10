package cmd

import (
	"context"
	"os"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/cobra"
)

var batchImageUpdateCmd = &cobra.Command{
	Use:   "update-image",
	Short: "Blerp.",
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
		"Tag",
	)

	batchImageUpdateCmd.MarkPersistentFlagRequired("app")

	batchImageUpdateCmd.PersistentFlags().StringVarP(
		&imageRepoURI,
		"image-repo-uri",
		"i",
		"",
		"Image repo uri",
	)
}

func batchImageUpdate(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Println("Update releases with image:", imageRepoURI)

	return client.UpdateBatchImage(
		context.TODO(),
		config.Project,
		config.Cluster,
		&api.UpdateBatchImageRequest{
			ImageRepoURI: imageRepoURI,
			Tag:          tag,
		},
	)
}
