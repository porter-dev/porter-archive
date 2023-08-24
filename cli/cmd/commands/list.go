package commands

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/porter-dev/porter/cli/cmd/config"
	v2 "github.com/porter-dev/porter/cli/cmd/v2"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/spf13/cobra"
	"github.com/stefanmcshane/helm/pkg/release"
)

var allNamespaces bool

func registerCommand_List(cliConf config.CLIConfig) *cobra.Command {
	listCmd := &cobra.Command{
		Use:   "list",
		Short: "List applications, addons or jobs.",
		Run: func(cmd *cobra.Command, args []string) {
			if len(args) == 0 || (args[0] == "all") {
				err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, listAll)
				if err != nil {
					os.Exit(1)
				}
			} else {
				_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "invalid command: %s\n", args[0])
			}
		},
	}

	listAppsCmd := &cobra.Command{
		Use:     "apps",
		Aliases: []string{"applications", "app", "application"},
		Short:   "Lists applications in a specific namespace, or across all namespaces",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, listApps)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	listJobsCmd := &cobra.Command{
		Use:     "jobs",
		Aliases: []string{"job"},
		Short:   "Lists jobs in a specific namespace, or across all namespaces",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, listJobs)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	listAddonsCmd := &cobra.Command{
		Use:     "addons",
		Aliases: []string{"addon"},
		Short:   "Lists addons in a specific namespace, or across all namespaces",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, listAddons)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	listCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"the namespace of the release",
	)

	listCmd.PersistentFlags().BoolVar(
		&allNamespaces,
		"all-namespaces",
		false,
		"list resources for all namespaces",
	)

	listCmd.AddCommand(listAppsCmd)
	listCmd.AddCommand(listJobsCmd)
	listCmd.AddCommand(listAddonsCmd)

	return listCmd
}

func listAll(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, args []string) error {
	project, err := client.GetProject(ctx, cliConf.Project)
	if err != nil {
		return fmt.Errorf("could not retrieve project from Porter API. Please contact support@porter.run")
	}

	if project.ValidateApplyV2 {
		err = v2.ListAll(ctx)
		if err != nil {
			return err
		}
		return nil
	}

	err = writeReleases(ctx, client, cliConf, "all")
	if err != nil {
		return err
	}

	return nil
}

func listApps(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, args []string) error {
	project, err := client.GetProject(ctx, cliConf.Project)
	if err != nil {
		return fmt.Errorf("could not retrieve project from Porter API. Please contact support@porter.run")
	}

	if project.ValidateApplyV2 {
		err = v2.ListApps(ctx)
		if err != nil {
			return err
		}
		return nil
	}

	err = writeReleases(ctx, client, cliConf, "application")
	if err != nil {
		return err
	}

	return nil
}

func listJobs(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, args []string) error {
	project, err := client.GetProject(ctx, cliConf.Project)
	if err != nil {
		return fmt.Errorf("could not retrieve project from Porter API. Please contact support@porter.run")
	}

	if project.ValidateApplyV2 {
		err = v2.ListJobs(ctx)
		if err != nil {
			return err
		}
		return nil
	}

	err = writeReleases(ctx, client, cliConf, "job")
	if err != nil {
		return err
	}

	return nil
}

func listAddons(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, args []string) error {
	err := writeReleases(ctx, client, cliConf, "addon")
	if err != nil {
		return err
	}

	return nil
}

func writeReleases(ctx context.Context, client api.Client, cliConf config.CLIConfig, kind string) error {
	var namespaces []string
	var releases []*release.Release

	if allNamespaces {
		resp, err := client.GetK8sNamespaces(ctx, cliConf.Project, cliConf.Cluster)
		if err != nil {
			return err
		}

		namespaceResp := *resp

		for _, ns := range namespaceResp {
			namespaces = append(namespaces, ns.Name)
		}
	} else {
		namespaces = append(namespaces, namespace)
	}

	for _, ns := range namespaces {
		resp, err := client.ListReleases(ctx, cliConf.Project, cliConf.Cluster, ns,
			&types.ListReleasesRequest{
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
			},
		)
		if err != nil {
			return err
		}

		releases = append(releases, resp...)
	}

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 2, '\t', tabwriter.AlignRight)

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
