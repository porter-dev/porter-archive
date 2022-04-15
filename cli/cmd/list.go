package cmd

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/spf13/cobra"
	"helm.sh/helm/v3/pkg/release"
)

// listCmd represents the "porter list" base command when called
// without any subcommands
var listCmd = &cobra.Command{
	Use:   "list",
	Args:  cobra.ExactArgs(1),
	Short: "List applications or jobs.",
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

func init() {
	listCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"the namespace of the release",
	)

	listCmd.AddCommand(listAppsCmd)
	listCmd.AddCommand(listJobsCmd)

	rootCmd.AddCommand(listCmd)
}

func listApps(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
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

	writeReleases("application", releases)

	return nil
}

func listJobs(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
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

	writeReleases("job", releases)

	return nil
}

func writeReleases(kind string, releases []*release.Release) {
	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\t%s\n", "NAME", "NAMESPACE", "STATUS")

	for _, rel := range releases {
		if chartName := rel.Chart.Name(); kind == "application" && (chartName == "web" || chartName == "worker") {
			fmt.Fprintf(w, "%s\t%s\t%s\n", rel.Name, rel.Namespace, rel.Info.Status)
		} else if chartName := rel.Chart.Name(); kind == "job" && (chartName == "job") {
			fmt.Fprintf(w, "%s\t%s\t%s\n", rel.Name, rel.Namespace, rel.Info.Status)
		}
	}

	w.Flush()
}
