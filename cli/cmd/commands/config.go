package commands

import (
	"context"
	"errors"
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

// func registerCommand_Config() *cobra.Command {
func registerCommand_Config() *cobra.Command {
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
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 {
				err := checkLoginAndRunWithConfig(cmd, args, listAndSetProject)
				if err != nil {
					if errors.Is(err, errCreatingPorterAPIClient) {
						return errors.New("error creating porter API client. Please ensure you are logged in")
					}
					return fmt.Errorf("error checking login and setting project: %w", err)
				}
				return nil
			}
			err := checkLoginAndRunWithConfig(cmd, args, setProjectAndCluster)
			if err != nil {
				if errors.Is(err, errCreatingPorterAPIClient) {
					return errors.New("error creating porter API client. Please ensure you are logged in")
				}
				return fmt.Errorf("error checking login and setting project with cluster: %w", err)
			}

			return nil
		},
	}

	configSetClusterCmd := &cobra.Command{
		Use:   "set-cluster [id]",
		Args:  cobra.MaximumNArgs(1),
		Short: "Saves the cluster id in the default configuration",
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 {
				err := checkLoginAndRunWithConfig(cmd, args, listAndSetCluster)
				if err != nil {
					if errors.Is(err, errCreatingPorterAPIClient) {
						return errors.New("error creating porter API client. Please ensure you are logged in")
					}
					return fmt.Errorf("error checking login and setting project: %w", err)
				}
				return nil
			}

			_, currentProfile, err := currentProfileIncludingFlags(cmd)
			if err != nil {
				return fmt.Errorf("error whilst initialising config: %w", err)
			}

			clusterID, err := strconv.ParseUint(args[0], 10, 64)
			if err != nil {
				_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %v\n", err)
				os.Exit(1)
			}

			err = config.SetCluster(uint(clusterID), currentProfile)

			if err != nil {
				_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %v\n", err)
				os.Exit(1)
			}
			return nil
		},
	}

	configSetRegistryCmd := &cobra.Command{
		Use:   "set-registry [id]",
		Args:  cobra.MaximumNArgs(1),
		Short: "Saves the registry id in the default configuration",
		Run: func(cmd *cobra.Command, args []string) {
			if len(args) == 0 {
				err := checkLoginAndRunWithConfig(cmd, args, listAndSetRegistry)
				if err != nil {
					os.Exit(1)
				}
			} else {
				registryID, err := strconv.ParseUint(args[0], 10, 64)
				if err != nil {
					_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %v\n", err)
					os.Exit(1)
				}

				err = config.SetRegistry(uint(registryID))

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

			err = config.SetHelmRepo(uint(hrID))

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
		RunE: func(cmd *cobra.Command, args []string) error {
			_, currentProfile, err := currentProfileIncludingFlags(cmd)
			if err != nil {
				return fmt.Errorf("error whilst initialising config: %w", err)
			}

			err = config.SetHost(args[0], currentProfile)
			if err != nil {
				_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %s\n", err.Error())
				return err
			}
			return nil
		},
	}

	configSetKubeconfigCmd := &cobra.Command{
		Use:   "set-kubeconfig [kubeconfig-path]",
		Args:  cobra.ExactArgs(1),
		Short: "Saves the path to kubeconfig in the default configuration",
		Run: func(cmd *cobra.Command, args []string) {
			err := config.SetKubeconfig(args[0])
			if err != nil {
				_, _ = color.New(color.FgRed).Fprintf(os.Stderr, "An error occurred: %s\n", err.Error())
				os.Exit(1)
			}
		},
	}

	configSetProfileCmd := &cobra.Command{
		Use:   "set-profile [profile-name]",
		Args:  cobra.ExactArgs(1),
		Short: "Saves the path to kubeconfig in the default configuration",
		RunE: func(cmd *cobra.Command, args []string) error {
			return config.SetProfile(args[0])
		},
	}

	configCmd.AddCommand(configSetProjectCmd)
	configCmd.AddCommand(configSetClusterCmd)
	configCmd.AddCommand(configSetHostCmd)
	configCmd.AddCommand(configSetRegistryCmd)
	configCmd.AddCommand(configSetHelmRepoCmd)
	configCmd.AddCommand(configSetKubeconfigCmd)
	configCmd.AddCommand(configSetProfileCmd)
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
	if err != nil {
		return fmt.Errorf("error listing projects to set config: %w", err)
	}

	s.Stop()

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

	err = config.SetProject(uint(projID), currentProfile)
	if err != nil {
		return err
	}

	return nil
}

func setProjectAndCluster(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, currentProfile string, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	projID, err := strconv.ParseUint(args[0], 10, 64)
	if err != nil {
		return fmt.Errorf("error parsing project id: %w", err)
	}

	err = config.SetProject(uint(projID), currentProfile)
	if err != nil {
		return fmt.Errorf("error setting project: %w", err)
	}

	err = listAndSetProject(ctx, nil, client, cliConf, currentProfile, featureFlags, cmd, args)
	if err != nil {
		return err
	}
	err = listAndSetCluster(ctx, nil, client, cliConf, currentProfile, featureFlags, cmd, args)
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
	if err != nil {
		return err
	}

	s.Stop()

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

	err = config.SetCluster(uint(clusterID), currentProfile)
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

	err = config.SetRegistry(uint(regID))
	if err != nil {
		return fmt.Errorf("error setting registry: %w", err)
	}

	return nil
}
