package cmd

import (
	"context"
	"fmt"
	"os"

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
			fmt.Printf("An error occurred: %v\n", err)
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
			fmt.Printf("An error occurred: %v\n", err)
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

	user, err := client.AuthCheck(context.Background())

	if err != nil {
		return err
	}

	projects, err := client.ListUserProjects(context.Background(), user.ID)

	if err != nil {
		return err
	}

	for _, project := range projects {
		fmt.Println(project.Name, project.ID)
	}

	return nil
}
