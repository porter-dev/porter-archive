package cmd

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/spf13/viper"

	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/cobra"
)

// projectCmd represents the "porter project" base command when called
// without any subcommands
var projectCmd = &cobra.Command{
	Use:   "project",
	Short: "The commands that can be run for a project",
}

var createProjectCmd = &cobra.Command{
	Use:   "create [name]",
	Args:  cobra.ExactArgs(1),
	Short: "Creates a project with the authorized user as admin",
	Run: func(cmd *cobra.Command, args []string) {
		err := createProject(host, args[0])

		if err != nil {
			fmt.Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}
	},
}

var setProjectCmd = &cobra.Command{
	Use:   "set [id]",
	Args:  cobra.ExactArgs(1),
	Short: "Sets the current project as the project id.",
	Run: func(cmd *cobra.Command, args []string) {
		projID, err := strconv.ParseUint(args[0], 10, 64)

		if err != nil {
			fmt.Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}

		err = setProject(uint(projID))

		if err != nil {
			fmt.Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(projectCmd)

	projectCmd.AddCommand(createProjectCmd)

	createProjectCmd.PersistentFlags().StringVar(
		&host,
		"host",
		"http://localhost:10000",
		"host url of Porter instance",
	)

	projectCmd.AddCommand(setProjectCmd)
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

func setProject(id uint) error {
	fmt.Printf("Set the current project id as %d\n", id)
	viper.Set("project", id)
	return viper.WriteConfig()
}
