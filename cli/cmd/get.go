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
	"helm.sh/helm/v3/pkg/time"
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
		"",
		"the output format to use (\"yaml\" or \"json\")",
	)
}

type getReleaseInfo struct {
	Name         string
	Namespace    string
	LastDeployed time.Time `json:"last_deployed" yaml:"last_deployed"`
	ReleaseType  string    `json:"release_type" yaml:"release_type"`
}

func get(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	rel, err := client.GetRelease(context.Background(), config.Project, config.Cluster, namespace, args[0])

	if err != nil {
		return err
	}

	relInfo := &getReleaseInfo{
		Name:         rel.Name,
		Namespace:    rel.Namespace,
		LastDeployed: rel.Info.LastDeployed,
		ReleaseType:  rel.Chart.Metadata.Name,
	}

	if output == "yaml" {
		bytes, err := yaml.Marshal(relInfo)

		if err != nil {
			return err
		}

		fmt.Println(string(bytes))
	} else if output == "json" {
		bytes, err := json.Marshal(relInfo)

		if err != nil {
			return err
		}

		fmt.Println(string(bytes))
	} else {
		fmt.Printf("Name:          %s\n", relInfo.Name)
		fmt.Printf("Namespace:     %s\n", relInfo.Namespace)
		fmt.Printf("Last deployed: %s\n", relInfo.LastDeployed)
		fmt.Printf("Release type:  %s\n", relInfo.ReleaseType)
	}

	return nil
}
