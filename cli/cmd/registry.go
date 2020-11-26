package cmd

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/cobra"
)

// registryCmd represents the "porter registry" base command when called
// without any subcommands
var registryCmd = &cobra.Command{
	Use:   "registry",
	Short: "Commands that read from a connected registry",
}

var registryCmdListRepos = &cobra.Command{
	Use:   "repos list",
	Short: "Lists the repositories in a registry",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, listRepos)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(registryCmd)

	registryCmd.PersistentFlags().UintVar(
		&registryID,
		"registry-id",
		0,
		"id of the registry",
	)

	registryCmd.AddCommand(registryCmdListRepos)
}

func listRepos(user *api.AuthCheckResponse, client *api.Client, args []string) error {
	pID := getProjectID()
	rID := getRegistryID()

	// get the list of namespaces
	repos, err := client.ListRegistryRepositories(
		context.Background(),
		pID,
		rID,
	)

	if err != nil {
		return err
	}

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\n", "NAME", "CREATED_AT")

	for _, repo := range repos {
		fmt.Fprintf(w, "%s\t%s\n", repo.Name, repo.CreatedAt.String())
	}

	w.Flush()

	return nil
}
