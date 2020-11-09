package cmd

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/cobra"
)

// projectCmd represents the "porter project" base command when called
// without any subcommands
var projectCmd = &cobra.Command{
	Use:   "project",
	Short: "Commands that control Porter project settings",
}

var createProjectCmd = &cobra.Command{
	Use:   "create [name]",
	Args:  cobra.ExactArgs(1),
	Short: "Creates a project with the authorized user as admin",
	Run: func(cmd *cobra.Command, args []string) {
		err := createProject(getHost(), args[0])

		if err != nil {
			os.Exit(1)
		}
	},
}

var listProjectCmd = &cobra.Command{
	Use:   "list",
	Short: "Lists the projects for the logged in user",
	Run: func(cmd *cobra.Command, args []string) {
		err := listProjects(getHost())

		if err != nil {
			os.Exit(1)
		}
	},
}

var listProjectClustersCmd = &cobra.Command{
	Use:   "clusters list",
	Short: "Lists the linked clusters for a project",
	Run: func(cmd *cobra.Command, args []string) {
		err := listProjectClusters(getHost(), getProjectID())

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(projectCmd)

	projectCmd.AddCommand(createProjectCmd)

	projectCmd.PersistentFlags().StringVar(
		&host,
		"host",
		getHost(),
		"host url of Porter instance",
	)

	projectCmd.AddCommand(listProjectCmd)

	projectCmd.AddCommand(listProjectClustersCmd)
}

func createProject(host string, name string) error {
	client := api.NewClient(host+"/api", "cookie.json")

	resp, err := client.CreateProject(context.Background(), &api.CreateProjectRequest{
		Name: name,
	})

	if err != nil {
		return err
	}

	fmt.Printf("Created project with name %s and id %d\n", name, resp.ID)

	return setProject(resp.ID)
}

func listProjects(host string) error {
	client := api.NewClient(host+"/api", "cookie.json")

	user, err := check(client)

	if err != nil {
		return err
	}

	projects, err := client.ListUserProjects(context.Background(), user.ID)

	if err != nil {
		return err
	}

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\n", "ID", "NAME")

	currProjectID := getProjectID()

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

func listProjectClusters(host string, projectID uint) error {
	client := api.NewClient(host+"/api", "cookie.json")

	_, err := check(client)

	if err != nil {
		return err
	}

	clusters, err := client.ListProjectClusters(context.Background(), projectID)

	if err != nil {
		return err
	}

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\t%s\n", "ID", "NAME", "SERVER")

	for _, cluster := range clusters {
		fmt.Fprintf(w, "%d\t%s\t%s\n", cluster.ID, cluster.Name, cluster.Server)
	}

	w.Flush()

	return nil
}
