package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v2"
)

// getCmd represents the "porter get" base command when called
// without any subcommands
var getCmd = &cobra.Command{
	Use:   "get [release]",
	Args:  cobra.ExactArgs(1),
	Short: "Fetches a release.",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, get)

		if err != nil {
			os.Exit(1)
		}
	},
}

var output string

func init() {
	rootCmd.AddCommand(getCmd)

	getCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"the namespace of the release",
	)

	getCmd.PersistentFlags().StringVar(
		&output,
		"output",
		"yaml",
		"the output format to use (\"yaml\" or \"json\")",
	)
}

func get(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	rel, err := client.GetRelease(context.Background(), config.Project, config.Cluster, namespace, args[0])
	if err != nil {
		return err
	}

	var bytes []byte

	if output == "yaml" {
		bytes, err = yaml.Marshal(rel)

		if err != nil {
			return err
		}
	} else if output == "json" {
		bytes, err = json.Marshal(rel)

		if err != nil {
			return err
		}
	} else {
		return fmt.Errorf("invalid output format: %s", output)
	}

	fmt.Println(string(bytes))

	return nil
}
