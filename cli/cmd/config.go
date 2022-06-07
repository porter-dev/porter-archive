package cmd

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	cliConfig "github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
)

var cliConf = cliConfig.GetCLIConfig()

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Commands that control local configuration settings",
	Run: func(cmd *cobra.Command, args []string) {
		if err := printConfig(); err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}
	},
}

var configSetProjectCmd = &cobra.Command{
	Use:   "set-project [id]",
	Args:  cobra.MaximumNArgs(1),
	Short: "Saves the project id in the default configuration",
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) == 0 {
			err := checkLoginAndRun(args, listAndSetProject)

			if err != nil {
				os.Exit(1)
			}
		} else {
			projID, err := strconv.ParseUint(args[0], 10, 64)

			if err != nil {
				color.New(color.FgRed).Printf("An error occurred: %v\n", err)
				os.Exit(1)
			}

			err = cliConf.SetProject(uint(projID))

			if err != nil {
				color.New(color.FgRed).Printf("An error occurred: %v\n", err)
				os.Exit(1)
			}
		}
	},
}

var configSetClusterCmd = &cobra.Command{
	Use:   "set-cluster [id]",
	Args:  cobra.MaximumNArgs(1),
	Short: "Saves the cluster id in the default configuration",
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) == 0 {
			err := checkLoginAndRun(args, listAndSetCluster)

			if err != nil {
				os.Exit(1)
			}
		} else {
			clusterID, err := strconv.ParseUint(args[0], 10, 64)

			if err != nil {
				color.New(color.FgRed).Printf("An error occurred: %v\n", err)
				os.Exit(1)
			}

			err = cliConf.SetCluster(uint(clusterID))

			if err != nil {
				color.New(color.FgRed).Printf("An error occurred: %v\n", err)
				os.Exit(1)
			}
		}
	},
}

var configSetRegistryCmd = &cobra.Command{
	Use:   "set-registry [id]",
	Args:  cobra.MaximumNArgs(1),
	Short: "Saves the registry id in the default configuration",
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) == 0 {
			err := checkLoginAndRun(args, listAndSetRegistry)

			if err != nil {
				os.Exit(1)
			}
		} else {
			registryID, err := strconv.ParseUint(args[0], 10, 64)

			if err != nil {
				color.New(color.FgRed).Printf("An error occurred: %v\n", err)
				os.Exit(1)
			}

			err = cliConf.SetRegistry(uint(registryID))

			if err != nil {
				color.New(color.FgRed).Printf("An error occurred: %v\n", err)
				os.Exit(1)
			}
		}
	},
}

var configSetHelmRepoCmd = &cobra.Command{
	Use:   "set-helmrepo [id]",
	Args:  cobra.ExactArgs(1),
	Short: "Saves the helm repo id in the default configuration",
	Run: func(cmd *cobra.Command, args []string) {
		hrID, err := strconv.ParseUint(args[0], 10, 64)

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}

		err = cliConf.SetHelmRepo(uint(hrID))

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}
	},
}

var configSetHostCmd = &cobra.Command{
	Use:   "set-host [host]",
	Args:  cobra.ExactArgs(1),
	Short: "Saves the host in the default configuration",
	Run: func(cmd *cobra.Command, args []string) {
		err := cliConf.SetHost(args[0])

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}
	},
}

var configSetKubeconfigCmd = &cobra.Command{
	Use:   "set-kubeconfig [kubeconfig-path]",
	Args:  cobra.ExactArgs(1),
	Short: "Saves the path to kubeconfig in the default configuration",
	Run: func(cmd *cobra.Command, args []string) {
		err := cliConf.SetKubeconfig(args[0])

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(configCmd)

	configCmd.AddCommand(configSetProjectCmd)
	configCmd.AddCommand(configSetClusterCmd)
	configCmd.AddCommand(configSetHostCmd)
	configCmd.AddCommand(configSetRegistryCmd)
	configCmd.AddCommand(configSetHelmRepoCmd)
	configCmd.AddCommand(configSetKubeconfigCmd)
}

func printConfig() error {
	config, err := ioutil.ReadFile(filepath.Join(home, ".porter", "porter.yaml"))

	if err != nil {
		return err
	}

	fmt.Println(string(config))

	return nil
}

func listAndSetProject(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	s := spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	s.Color("cyan")
	s.Suffix = " Loading list of projects"
	s.Start()

	resp, err := client.ListUserProjects(context.Background())

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

	cliConf.SetProject(uint(projID))

	return nil
}

func listAndSetCluster(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	s := spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	s.Color("cyan")
	s.Suffix = " Loading list of clusters"
	s.Start()

	resp, err := client.ListProjectClusters(context.Background(), cliConf.Project)

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

	cliConf.SetCluster(uint(clusterID))

	return nil
}

func listAndSetRegistry(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	s := spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	s.Color("cyan")
	s.Suffix = " Loading list of registries"
	s.Start()

	resp, err := client.ListRegistries(context.Background(), cliConf.Project)

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

	cliConf.SetRegistry(uint(regID))

	return nil
}
