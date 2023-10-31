package commands

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
)

func registerCommand_Config(cliConf config.CLIConfig, currentProfile string) *cobra.Command {
	configCmd := &cobra.Command{
		Use:   "config",
		Short: "Commands that control local configuration settings",
		Run: func(cmd *cobra.Command, args []string) {
			if err := printConfig(); err != nil {
				_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %v\n", err)
				os.Exit(1)
			}
		},
	}

	configSetProjectCmd := &cobra.Command{
		Use:   "set-project [id]",
		Args:  cobra.MaximumNArgs(1),
		Short: "Saves the project id in the default configuration",
		Run: func(cmd *cobra.Command, args []string) {
			client, err := api.NewClientWithConfig(cmd.Context(), api.NewClientInput{
				BaseURL:        fmt.Sprintf("%s/api", cliConf.Host),
				BearerToken:    cliConf.Token,
				CookieFileName: "cookie.json",
			})
			if err != nil {
				_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "error creating porter API client: %s\n", err.Error())
				os.Exit(1)
			}

			if len(args) == 0 {
				err := checkLoginAndRunWithConfig(cmd, cliConf, currentProfile, args, listAndSetProject)
				if err != nil {
					os.Exit(1)
				}
			} else {
				projID, err := strconv.ParseUint(args[0], 10, 64)
				if err != nil {
					_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %s\n", err.Error())
					os.Exit(1)
				}

				err = cliConf.SetProject(cmd.Context(), client, uint(projID), currentProfile)
				if err != nil {
					_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %s\n", err.Error())
					os.Exit(1)
				}
			}
		},
	}

	configSetClusterCmd := &cobra.Command{
		Use:   "set-cluster [id]",
		Args:  cobra.MaximumNArgs(1),
		Short: "Saves the cluster id in the default configuration",
		Run: func(cmd *cobra.Command, args []string) {
			if len(args) == 0 {
				err := checkLoginAndRunWithConfig(cmd, cliConf, currentProfile, args, listAndSetCluster)
				if err != nil {
					os.Exit(1)
				}
			} else {
				clusterID, err := strconv.ParseUint(args[0], 10, 64)
				if err != nil {
					_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %v\n", err)
					os.Exit(1)
				}

				err = cliConf.SetCluster(uint(clusterID))

				if err != nil {
					_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %v\n", err)
					os.Exit(1)
				}
			}
		},
	}

	configSetRegistryCmd := &cobra.Command{
		Use:   "set-registry [id]",
		Args:  cobra.MaximumNArgs(1),
		Short: "Saves the registry id in the default configuration",
		Run: func(cmd *cobra.Command, args []string) {
			if len(args) == 0 {
				err := checkLoginAndRunWithConfig(cmd, cliConf, currentProfile, args, listAndSetRegistry)
				if err != nil {
					os.Exit(1)
				}
			} else {
				registryID, err := strconv.ParseUint(args[0], 10, 64)
				if err != nil {
					_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %v\n", err)
					os.Exit(1)
				}

				err = cliConf.SetRegistry(uint(registryID))

				if err != nil {
					_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %v\n", err)
					os.Exit(1)
				}
			}
		},
	}

	configSetHelmRepoCmd := &cobra.Command{
		Use:   "set-helmrepo [id]",
		Args:  cobra.ExactArgs(1),
		Short: "Saves the helm repo id in the default configuration",
		Run: func(cmd *cobra.Command, args []string) {
			hrID, err := strconv.ParseUint(args[0], 10, 64)
			if err != nil {
				_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %v\n", err)
				os.Exit(1)
			}

			err = cliConf.SetHelmRepo(uint(hrID))

			if err != nil {
				_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %v\n", err)
				os.Exit(1)
			}
		},
	}

	configSetHostCmd := &cobra.Command{
		Use:   "set-host [host]",
		Args:  cobra.ExactArgs(1),
		Short: "Saves the host in the default configuration",
		Run: func(cmd *cobra.Command, args []string) {
			err := cliConf.SetHost(args[0], currentProfile)
			if err != nil {
				_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %s\n", err.Error())
				os.Exit(1)
			}
		},
	}

	configSetKubeconfigCmd := &cobra.Command{
		Use:   "set-kubeconfig [kubeconfig-path]",
		Args:  cobra.ExactArgs(1),
		Short: "Saves the path to kubeconfig in the default configuration",
		Run: func(cmd *cobra.Command, args []string) {
			err := cliConf.SetKubeconfig(args[0])
			if err != nil {
				_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %s\n", err.Error())
				os.Exit(1)
			}
		},
	}

	configCmd.AddCommand(configSetProjectCmd)
	configCmd.AddCommand(configSetClusterCmd)
	configCmd.AddCommand(configSetHostCmd)
	configCmd.AddCommand(configSetRegistryCmd)
	configCmd.AddCommand(configSetHelmRepoCmd)
	configCmd.AddCommand(configSetKubeconfigCmd)
	return configCmd
}

func printConfig() error {
	config, err := os.ReadFile(filepath.Join(home, ".porter", "porter.yaml"))
	if err != nil {
		return err
	}

	fmt.Println(string(config))

	return nil
}

func listAndSetProject(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, currentProfile string, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	s := spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	_ = s.Color("cyan")
	s.Suffix = " Loading list of projects"
	s.Start()

	resp, err := client.ListUserProjects(ctx)

	s.Stop()

	if err != nil {
		return err
	}

	var projID uint64

	if len(*resp) > 1 {
		// only give the option to select when more than one option exists
		projName, err := utils.PromptSelect("Select a project with ID", func() []string {
			var names []string

			for _, proj := range *resp {
				names = append(names, fmt.Sprintf("%s - %d", proj.Name, proj.ID))
			}

			return names
		}())
		if err != nil {
			return err
		}

		projID, _ = strconv.ParseUint(strings.Split(projName, " - ")[1], 10, 64)
	} else {
		projID = uint64((*resp)[0].ID)
	}

	err = cliConf.SetProject(ctx, client, uint(projID), currentProfile)
	if err != nil {
		return err
	}

	return nil
}

func listAndSetCluster(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, currentProfile string, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	s := spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	_ = s.Color("cyan")
	s.Suffix = " Loading list of clusters"
	s.Start()

	resp, err := client.ListProjectClusters(ctx, cliConf.Project)

	s.Stop()

	if err != nil {
		return err
	}

	var clusterID uint64

	if len(*resp) > 1 {
		clusterName, err := utils.PromptSelect("Select a cluster with ID", func() []string {
			var names []string

			for _, cluster := range *resp {
				names = append(names, fmt.Sprintf("%s - %d", cluster.Name, cluster.ID))
			}

			return names
		}())
		if err != nil {
			return err
		}

		clusterID, _ = strconv.ParseUint(strings.Split(clusterName, " - ")[1], 10, 64)
	} else {
		clusterID = uint64((*resp)[0].ID)
	}

	err = cliConf.SetCluster(uint(clusterID))
	if err != nil {
		return fmt.Errorf("unable to set cluster: %w", err)
	}

	return nil
}

func listAndSetRegistry(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, currentProfile string, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	s := spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	_ = s.Color("cyan")
	s.Suffix = " Loading list of registries"
	s.Start()

	resp, err := client.ListRegistries(ctx, cliConf.Project)

	s.Stop()

	if err != nil {
		return err
	}

	var regID uint64

	if len(*resp) > 1 {
		regName, err := utils.PromptSelect("Select a registry with ID", func() []string {
			var names []string

			for _, cluster := range *resp {
				names = append(names, fmt.Sprintf("%s - %d", cluster.Name, cluster.ID))
			}

			return names
		}())
		if err != nil {
			return err
		}

		regID, _ = strconv.ParseUint(strings.Split(regName, " - ")[1], 10, 64)
	} else {
		regID = uint64((*resp)[0].ID)
	}

	err = cliConf.SetRegistry(uint(regID))
	if err != nil {
		return fmt.Errorf("error setting registry: %w", err)
	}

	return nil
}
