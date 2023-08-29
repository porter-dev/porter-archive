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

func registerCommand_Project(cliConf config.CLIConfig) *cobra.Command {
	projectCmd := &cobra.Command{
		Use:     "project",
		Aliases: []string{"projects"},
		Short:   "Commands that control Porter project settings",
	}

	createProjectCmd := &cobra.Command{
		Use:   "create [name]",
		Args:  cobra.ExactArgs(1),
		Short: "Creates a project with the authorized user as admin",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, createProject)
			if err != nil {
				os.Exit(1)
			}
		},
	}
	projectCmd.AddCommand(createProjectCmd)

	deleteProjectCmd := &cobra.Command{
		Use:   "delete [id]",
		Args:  cobra.ExactArgs(1),
		Short: "Deletes the project with the given id",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, deleteProject)
			if err != nil {
				os.Exit(1)
			}
		},
	}
	projectCmd.AddCommand(deleteProjectCmd)

	listProjectCmd := &cobra.Command{
		Use:   "list",
		Short: "Lists the projects for the logged in user",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, listProjects)
			if err != nil {
				os.Exit(1)
			}
		},
	}
	projectCmd.AddCommand(listProjectCmd)

	return projectCmd
}

func createProject(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, args []string) error {
	resp, err := client.CreateProject(ctx, &types.CreateProjectRequest{
		Name: args[0],
	})
	if err != nil {
		return err
	}

	color.New(color.FgGreen).Printf("Created project with name %s and id %d\n", args[0], resp.ID)

	return cliConf.SetProject(ctx, client, resp.ID)
}

func listProjects(ctx context.Context, user *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, args []string) error {
	resp, err := client.ListUserProjects(ctx)
	if err != nil {
		return err
	}

	projects := *resp

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\n", "ID", "NAME")

	currProjectID := cliConf.Project

	for _, project := range projects {
		if currProjectID == project.ID {
			color.New(color.FgGreen).Fprintf(w, "%d\t%s (current project)\n", project.ID, project.Name)
		} else {
			fmt.Fprintf(w, "%d\t%s\n", project.ID, project.Name)
		}
	}

	w.Flush()

	return nil
}

func deleteProject(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConfig config.CLIConfig, _ config.FeatureFlags, args []string) error {
	userResp, err := utils.PromptPlaintext(
		fmt.Sprintf(
			`Are you sure you'd like to delete the project with id %s? %s `,
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

		err = client.DeleteProject(ctx, uint(id))

		if err != nil {
			return err
		}

		color.New(color.FgGreen).Printf("Deleted project with id %d\n", id)
	}

	return nil
}

func setProjectCluster(ctx context.Context, client api.Client, cliConf config.CLIConfig, projectID uint) error {
	resp, err := client.ListProjectClusters(ctx, projectID)
	if err != nil {
		return err
	}

	clusters := *resp

	if len(clusters) > 0 {
		cliConf.SetCluster(clusters[0].ID)
	}

	return nil
}
