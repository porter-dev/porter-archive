package cmd

import (
	"context"
	"fmt"
	"os"
	"strings"
	"text/tabwriter"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/cobra"
)

// helmRepoCmd represents the "porter helmrepo" base command when called
// without any subcommands
var helmRepoCmd = &cobra.Command{
	Use:     "helmrepo",
	Aliases: []string{"helm", "helmrepos"},
	Short:   "Commands that read from a connected Helm repository",
}

var helmRepoListCmd = &cobra.Command{
	Use:   "list",
	Short: "Lists the Helm repositories linked to a project",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, listHelmRepos)

		if err != nil {
			os.Exit(1)
		}
	},
}

var helmRepoChartCmd = &cobra.Command{
	Use:     "chart",
	Aliases: []string{"charts"},
	Short:   "Commands for interacting with Helm repository charts",
}

var helmRepoChartListCmd = &cobra.Command{
	Use:   "list",
	Short: "Lists charts in the default Helm repository",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, listHelmRepoCharts)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(helmRepoCmd)

	helmRepoCmd.PersistentFlags().AddFlagSet(helmRepoFlagSet)

	helmRepoCmd.AddCommand(helmRepoListCmd)
	helmRepoCmd.AddCommand(helmRepoChartCmd)

	helmRepoChartCmd.AddCommand(helmRepoChartListCmd)
}

func listHelmRepos(user *api.AuthCheckResponse, client *api.Client, args []string) error {
	pID := config.Project

	hrs, err := client.ListHelmRepos(
		context.Background(),
		pID,
	)

	if err != nil {
		return err
	}

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", "ID", "NAME", "URL", "SERVICE")

	currHelmID := config.HelmRepo

	for _, hr := range hrs {
		if currHelmID == hr.ID {
			color.New(color.FgGreen).Fprintf(w, "%d\t%s\t%s\t%s (current helm repo)\n", hr.ID, hr.Name, hr.RepoURL, hr.Service)
		} else {
			fmt.Fprintf(w, "%d\t%s\t%s\t%s\n", hr.ID, hr.Name, hr.RepoURL, hr.Service)
		}
	}

	w.Flush()

	return nil
}

func listHelmRepoCharts(user *api.AuthCheckResponse, client *api.Client, args []string) error {
	pID := config.Project
	hrID := config.HelmRepo

	charts, err := client.ListCharts(
		context.Background(),
		pID,
		hrID,
	)

	if err != nil {
		return err
	}

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\n", "NAME", "VERSION")

	for _, chart := range charts {
		for _, version := range chart.Versions {
			fmt.Fprintf(w, "%s\t%s\n", strings.ToLower(chart.Name), version)
		}
	}

	w.Flush()

	return nil
}
