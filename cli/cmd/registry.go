package cmd

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
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
)

// registryCmd represents the "porter registry" base command when called
// without any subcommands
var registryCmd = &cobra.Command{
	Use:     "registry",
	Aliases: []string{"registries"},
	Short:   "Commands that read from a connected registry",
}

var registryListCmd = &cobra.Command{
	Use:   "list",
	Short: "Lists the registries linked to a project",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, listRegistries)

		if err != nil {
			os.Exit(1)
		}
	},
}

var registryDeleteCmd = &cobra.Command{
	Use:   "delete [id]",
	Args:  cobra.ExactArgs(1),
	Short: "Deletes the registry with the given id",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deleteRegistry)

		if err != nil {
			os.Exit(1)
		}
	},
}

var registryReposCmd = &cobra.Command{
	Use:     "repo",
	Aliases: []string{"repos", "repository", "repositories"},
	Short:   "Commands that perform operations on image registry repositories",
}

var registryReposListCmd = &cobra.Command{
	Use:   "list",
	Short: "Lists the repositories in an image registry",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, listRepos)

		if err != nil {
			os.Exit(1)
		}
	},
}

var registryImageCmd = &cobra.Command{
	Use:     "image",
	Aliases: []string{"images"},
	Short:   "Commands that perform operations on image in a repository",
}

var registryImageListCmd = &cobra.Command{
	Use:   "list [repo_name]",
	Args:  cobra.ExactArgs(1),
	Short: "Lists the images the specified image repository",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, listImages)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(registryCmd)

	registryCmd.PersistentFlags().AddFlagSet(registryFlagSet)

	registryCmd.AddCommand(registryReposCmd)
	registryCmd.AddCommand(registryListCmd)
	registryCmd.AddCommand(registryDeleteCmd)

	registryReposCmd.AddCommand(registryReposListCmd)

	registryCmd.AddCommand(registryImageCmd)
	registryImageCmd.AddCommand(registryImageListCmd)
}

func listRegistries(user *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	pID := config.Project

	// get the list of namespaces
	resp, err := client.ListRegistries(
		context.Background(),
		pID,
	)

	if err != nil {
		return err
	}

	registries := *resp

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\t%s\n", "ID", "URL", "SERVICE")

	currRegistryID := config.Registry

	for _, registry := range registries {
		if currRegistryID == registry.ID {
			color.New(color.FgGreen).Fprintf(w, "%d\t%s\t%s (current registry)\n", registry.ID, registry.URL, registry.Service)
		} else {
			fmt.Fprintf(w, "%d\t%s\t%s\n", registry.ID, registry.URL, registry.Service)
		}
	}

	w.Flush()

	return nil
}

func deleteRegistry(user *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	userResp, err := utils.PromptPlaintext(
		fmt.Sprintf(
			`Are you sure you'd like to delete the registry with id %s? %s `,
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

		err = client.DeleteProjectRegistry(context.Background(), config.Project, uint(id))

		if err != nil {
			return err
		}

		color.New(color.FgGreen).Printf("Deleted registry with id %d\n", id)
	}

	return nil
}

func listRepos(user *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	pID := config.Project
	rID := config.Registry

	// get the list of namespaces
	resp, err := client.ListRegistryRepositories(
		context.Background(),
		pID,
		rID,
	)

	if err != nil {
		return err
	}

	repos := *resp

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\n", "NAME", "CREATED_AT")

	for _, repo := range repos {
		fmt.Fprintf(w, "%s\t%s\n", repo.Name, repo.CreatedAt.String())
	}

	w.Flush()

	return nil
}

func listImages(user *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	pID := config.Project
	rID := config.Registry
	repoName := args[0]

	// get the list of namespaces
	resp, err := client.ListImages(
		context.Background(),
		pID,
		rID,
		repoName,
	)

	if err != nil {
		return err
	}

	imgs := *resp

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\n", "IMAGE", "DIGEST")

	for _, img := range imgs {
		fmt.Fprintf(w, "%s\t%s\n", repoName+":"+img.Tag, img.Digest)
	}

	w.Flush()

	return nil
}
