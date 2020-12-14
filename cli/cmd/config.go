package cmd

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strconv"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// a set of shared flags
var (
	driver     string
	host       string
	projectID  uint
	registryID uint
	clusterID  uint
	helmRepoID uint
)

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

var setProjectCmd = &cobra.Command{
	Use:   "set-project [id]",
	Args:  cobra.ExactArgs(1),
	Short: "Saves the project id in the default configuration",
	Run: func(cmd *cobra.Command, args []string) {
		projID, err := strconv.ParseUint(args[0], 10, 64)

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}

		err = setProject(uint(projID))

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}
	},
}

var setClusterCmd = &cobra.Command{
	Use:   "set-cluster [id]",
	Args:  cobra.ExactArgs(1),
	Short: "Saves the cluster id in the default configuration",
	Run: func(cmd *cobra.Command, args []string) {
		clusterID, err := strconv.ParseUint(args[0], 10, 64)

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}

		err = setCluster(uint(clusterID))

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}
	},
}

var setRegistryCmd = &cobra.Command{
	Use:   "set-registry [id]",
	Args:  cobra.ExactArgs(1),
	Short: "Saves the registry id in the default configuration",
	Run: func(cmd *cobra.Command, args []string) {
		registryID, err := strconv.ParseUint(args[0], 10, 64)

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}

		err = setRegistry(uint(registryID))

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}
	},
}

var setHelmRepoCmd = &cobra.Command{
	Use:   "set-helmrepo [id]",
	Args:  cobra.ExactArgs(1),
	Short: "Saves the helm repo id in the default configuration",
	Run: func(cmd *cobra.Command, args []string) {
		hrID, err := strconv.ParseUint(args[0], 10, 64)

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}

		err = setHelmRepo(uint(hrID))

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}
	},
}

var setHostCmd = &cobra.Command{
	Use:   "set-host [host]",
	Args:  cobra.ExactArgs(1),
	Short: "Saves the host in the default configuration",
	Run: func(cmd *cobra.Command, args []string) {
		err := setHost(args[0])

		if err != nil {
			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(configCmd)

	configCmd.AddCommand(setProjectCmd)
	configCmd.AddCommand(setClusterCmd)
	configCmd.AddCommand(setHostCmd)
	configCmd.AddCommand(setRegistryCmd)
	configCmd.AddCommand(setHelmRepoCmd)
}

func setDriver(driver string) error {
	viper.Set("driver", driver)
	err := viper.WriteConfig()
	color.New(color.FgGreen).Printf("Set the current driver as %s\n", driver)
	return err
}

func getDriver() string {
	if driver != "" {
		return driver
	}

	if opts.driver != "" {
		return opts.driver
	}

	return viper.GetString("driver")
}

func printConfig() error {
	config, err := ioutil.ReadFile(filepath.Join(home, ".porter", "porter.yaml"))

	if err != nil {
		return err
	}

	fmt.Printf(string(config))

	return nil
}

func setProject(id uint) error {
	viper.Set("project", id)
	color.New(color.FgGreen).Printf("Set the current project id as %d\n", id)
	return viper.WriteConfig()
}

func setCluster(id uint) error {
	viper.Set("cluster", id)
	color.New(color.FgGreen).Printf("Set the current cluster id as %d\n", id)
	return viper.WriteConfig()
}

func setRegistry(id uint) error {
	viper.Set("registry", id)
	color.New(color.FgGreen).Printf("Set the current registry id as %d\n", id)
	return viper.WriteConfig()
}

func setHelmRepo(id uint) error {
	viper.Set("helm_repo", id)
	color.New(color.FgGreen).Printf("Set the current helm repo id as %d\n", id)
	return viper.WriteConfig()
}

func setHost(host string) error {
	viper.Set("host", host)
	err := viper.WriteConfig()
	color.New(color.FgGreen).Printf("Set the current host as %s\n", host)
	return err
}

func getHost() string {
	if host != "" {
		return host
	}

	return viper.GetString("host")
}

func getClusterID() uint {
	if clusterID != 0 {
		return clusterID
	}

	return viper.GetUint("cluster")
}

func getRegistryID() uint {
	if registryID != 0 {
		return registryID
	}

	return viper.GetUint("registry")
}

func getHelmRepoID() uint {
	if helmRepoID != 0 {
		return helmRepoID
	}

	return viper.GetUint("helm_repo")
}

func getProjectID() uint {
	if projectID != 0 {
		return projectID
	}

	return viper.GetUint("project")
}
