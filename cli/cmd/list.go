package cmd

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/spf13/cobra"
)

// listCmd represents the "porter list" base command and "porter list all" subcommand
var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List applications, addons or jobs.",
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) == 0 || (args[0] == "all") {
			err := checkLoginAndRun(args, listAll)

			if err != nil {
				os.Exit(1)
			}
		} else {
			color.New(color.FgRed).Printf("invalid command: %s\n", args[0])
		}
	},
}

var listAppsCmd = &cobra.Command{
	Use:     "apps",
	Aliases: []string{"applications", "app", "application"},
	Short:   "Lists applications in a specific namespace, or across all namespaces",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, listApps)

		if err != nil {
			os.Exit(1)
		}
	},
}

var listJobsCmd = &cobra.Command{
	Use:     "jobs",
	Aliases: []string{"job"},
	Short:   "Lists jobs in a specific namespace, or across all namespaces",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, listJobs)

		if err != nil {
			os.Exit(1)
		}
	},
}

var listAddonsCmd = &cobra.Command{
	Use:     "addons",
	Aliases: []string{"addon"},
	Short:   "Lists addons in a specific namespace, or across all namespaces",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, listAddons)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	listCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"the namespace of the release",
	)

	listCmd.AddCommand(listAppsCmd)
	listCmd.AddCommand(listJobsCmd)
	listCmd.AddCommand(listAddonsCmd)

	rootCmd.AddCommand(listCmd)
}

func listAll(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	err := writeReleases(client, "all")

	if err != nil {
		return err
	}

	return nil
}

func listApps(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	err := writeReleases(client, "application")

	if err != nil {
		return err
	}

	return nil
}

func listJobs(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	err := writeReleases(client, "job")

	if err != nil {
		return err
	}

	return nil
}

func listAddons(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	err := writeReleases(client, "addon")

	if err != nil {
		return err
	}

	return nil
}

func writeReleases(client *api.Client, kind string) error {
	releases, err := client.ListReleases(context.Background(), cliConf.Project, cliConf.Cluster, namespace, &types.ListReleasesRequest{
		ReleaseListFilter: &types.ReleaseListFilter{
			Limit: 50,
			Skip:  0,
			StatusFilter: []string{
				"deployed",
				"uninstalled",
				"pending",
				"pending-install",
				"pending-upgrade",
				"pending-rollback",
				"failed",
			},
		},
	})

	if err != nil {
		return err
	}

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", "NAME", "NAMESPACE", "STATUS", "KIND")

	for _, rel := range releases {
		chartName := rel.Chart.Name()

		if kind == "all" {
			fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", rel.Name, rel.Namespace, rel.Info.Status, chartName)
		} else if kind == "application" && (chartName == "web" || chartName == "worker") {
			fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", rel.Name, rel.Namespace, rel.Info.Status, chartName)
		} else if kind == "job" && chartName == "job" {
			fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", rel.Name, rel.Namespace, rel.Info.Status, chartName)
		} else if kind == "addon" && chartName != "web" && chartName != "worker" && chartName != "job" {
			fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", rel.Name, rel.Namespace, rel.Info.Status, chartName)
		}
	}

	w.Flush()

	return nil
}
