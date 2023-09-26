package commands

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/porter-dev/porter/cli/cmd/config"
	v2 "github.com/porter-dev/porter/cli/cmd/v2"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/spf13/cobra"
	"github.com/stefanmcshane/helm/pkg/time"
	"gopkg.in/yaml.v2"
)

var output string

func registerCommand_Get(cliConf config.CLIConfig) *cobra.Command {
	getCmd := &cobra.Command{
		Use:   "get [release]",
		Args:  cobra.ExactArgs(1),
		Short: "Fetches a release.",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, get)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	// getValuesCmd represents the "porter get values" command
	getValuesCmd := &cobra.Command{
		Use:   "values [release]",
		Args:  cobra.ExactArgs(1),
		Short: "Fetches the Helm values for a release.",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, getValues)
			if err != nil {
				os.Exit(1)
			}
		},
	}

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

	getCmd.AddCommand(getValuesCmd)

	return getCmd
}

type getReleaseInfo struct {
	Name         string    `json:"name" yaml:"name"`
	Namespace    string    `json:"namespace" yaml:"namespace"`
	LastDeployed time.Time `json:"last_deployed" yaml:"last_deployed"`
	ReleaseType  string    `json:"release_type" yaml:"release_type"`
	RevisionID   int       `json:"revision_id" yaml:"revision_id"`
}

func get(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	if featureFlags.ValidateApplyV2Enabled {
		err := v2.Get(ctx)
		if err != nil {
			return err
		}
		return nil
	}

	rel, err := client.GetRelease(ctx, cliConf.Project, cliConf.Cluster, namespace, args[0])
	if err != nil {
		return err
	}

	relInfo := &getReleaseInfo{
		Name:         rel.Name,
		Namespace:    rel.Namespace,
		LastDeployed: rel.Info.LastDeployed,
		ReleaseType:  rel.Chart.Metadata.Name,
		RevisionID:   rel.Release.Version,
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
		fmt.Printf("Revision ID:   %d\n", relInfo.RevisionID)
	}

	return nil
}

func getValues(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	if featureFlags.ValidateApplyV2Enabled {
		err := v2.GetValues(ctx)
		if err != nil {
			return err
		}
		return nil
	}

	rel, err := client.GetRelease(ctx, cliConf.Project, cliConf.Cluster, namespace, args[0])
	if err != nil {
		return err
	}

	values := rel.Config

	if output == "json" {
		bytes, err := json.Marshal(values)
		if err != nil {
			return err
		}

		fmt.Println(string(bytes))
	} else { // yaml is the default
		bytes, err := yaml.Marshal(values)
		if err != nil {
			return err
		}

		fmt.Println(string(bytes))
	}

	return nil
}
