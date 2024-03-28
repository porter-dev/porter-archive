package commands

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/spf13/cobra"
)

func registerCommand_Target(cliConf config.CLIConfig) *cobra.Command {
	targetCmd := &cobra.Command{
		Use:     "target",
		Aliases: []string{"targets"},
		Short:   "Commands that control Porter target settings",
	}

	createTargetCmd := &cobra.Command{
		Use:   "create --name [name]",
		Short: "Creates a deployment target",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, createTarget)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	var targetName string
	createTargetCmd.Flags().StringVar(&targetName, "name", "", "Name of deployment target")
	targetCmd.AddCommand(createTargetCmd)

	listTargetCmd := &cobra.Command{
		Use:   "list",
		Short: "Lists the deployment targets for the logged in user",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, listTargets)
			if err != nil {
				os.Exit(1)
			}
		},
	}
	targetCmd.AddCommand(listTargetCmd)

	return targetCmd
}

func createTarget(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	targetName, err := cmd.Flags().GetString("name")
	if err != nil {
		return fmt.Errorf("error finding name flag: %w", err)
	}

	resp, err := client.CreateDeploymentTarget(ctx, cliConf.Project, &types.CreateDeploymentTargetRequest{
		Name:      targetName,
		ClusterId: cliConf.Cluster,
	})
	if err != nil {
		return err
	}

	color.New(color.FgGreen).Printf("Created target with name %s and id %s\n", targetName, resp.DeploymentTargetID)

	return nil
}

func listTargets(ctx context.Context, user *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	resp, err := client.ListDeploymentTargets(ctx, cliConf.Project)
	if err != nil {
		return err
	}
	if resp == nil {
		return nil
	}

	targets := *resp

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\t%s\n", "ID", "NAME", "CLUSTER ID")

	for _, target := range targets.DeploymentTargets {
		fmt.Fprintf(w, "%s\t%s\t%d\n", target.ID, target.Name, target.ClusterID)
	}

	w.Flush()

	return nil
}
