package commands

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"text/tabwriter"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
)

func registerCommand_Cluster(cliConf config.CLIConfig) *cobra.Command {
	clusterCmd := &cobra.Command{
		Use:     "cluster",
		Aliases: []string{"clusters"},
		Short:   "Commands that read from a connected cluster",
	}

	clusterListCmd := &cobra.Command{
		Use:   "list",
		Short: "Lists the linked clusters in the current project",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, listClusters)
			if err != nil {
				os.Exit(1)
			}
		},
	}
	clusterCmd.AddCommand(clusterListCmd)

	clusterDeleteCmd := &cobra.Command{
		Use:   "delete [id]",
		Args:  cobra.ExactArgs(1),
		Short: "Deletes the cluster with the given id",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, deleteCluster)
			if err != nil {
				os.Exit(1)
			}
		},
	}
	clusterCmd.AddCommand(clusterDeleteCmd)

	clusterNamespaceCmd := &cobra.Command{
		Use:     "namespace",
		Aliases: []string{"namespaces"},
		Short:   "Commands that perform operations on cluster namespaces",
	}
	clusterCmd.AddCommand(clusterNamespaceCmd)

	clusterNamespaceListCmd := &cobra.Command{
		Use:   "list",
		Short: "Lists the namespaces in a cluster",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, listNamespaces)
			if err != nil {
				os.Exit(1)
			}
		},
	}
	clusterNamespaceCmd.AddCommand(clusterNamespaceListCmd)

	return clusterCmd
}

func listClusters(ctx context.Context, user *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, args []string) error {
	resp, err := client.ListProjectClusters(ctx, cliConf.Project)
	if err != nil {
		return err
	}

	clusters := *resp

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\t%s\n", "ID", "NAME", "SERVER")

	currClusterID := cliConf.Cluster

	for _, cluster := range clusters {
		if currClusterID == cluster.ID {
			color.New(color.FgGreen).Fprintf(w, "%d\t%s\t%s (current cluster)\n", cluster.ID, cluster.Name, cluster.Server)
		} else {
			fmt.Fprintf(w, "%d\t%s\t%s\n", cluster.ID, cluster.Name, cluster.Server)
		}
	}

	w.Flush()

	return nil
}

func deleteCluster(ctx context.Context, user *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, args []string) error {
	userResp, err := utils.PromptPlaintext(
		fmt.Sprintf(
			`Are you sure you'd like to delete the cluster with id %s? %s `,
			args[0],
			color.New(color.FgCyan).Sprintf("[y/n]"),
		),
	)
	if err != nil {
		return err
	}

	if userResp := strings.ToLower(userResp); userResp == "y" || userResp == "yes" {
		id, err := strconv.ParseUint(args[0], 10, 64)
		if err != nil {
			return err
		}

		err = client.DeleteProjectCluster(ctx, cliConf.Project, uint(id))

		if err != nil {
			return err
		}

		color.New(color.FgGreen).Printf("Deleted cluster with id %d\n", id)
	}

	return nil
}

func listNamespaces(ctx context.Context, user *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, args []string) error {
	pID := cliConf.Project

	// get the service account based on the cluster id
	cID := cliConf.Cluster

	// get the list of namespaces
	namespaceList, err := client.GetK8sNamespaces(
		ctx,
		pID,
		cID,
	)
	if err != nil {
		return err
	}

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\n", "NAME", "STATUS")

	namespaces := *namespaceList

	for _, namespace := range namespaces {
		fmt.Fprintf(w, "%s\t%s\n", namespace.Name, namespace.Status)
	}

	w.Flush()

	return nil
}
