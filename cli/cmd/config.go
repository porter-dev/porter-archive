package cmd

import (
	"os"
	"strconv"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// a set of shared flags
var (
	host      string
	projectID uint
)

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Commands that control local configuration settings",
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
	configCmd.AddCommand(setHostCmd)
}

func setProject(id uint) error {
	viper.Set("project", id)
	color.New(color.FgGreen).Printf("Set the current project id as %d\n", id)
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

func getProjectID() uint {
	if projectID != 0 {
		return projectID
	}

	return viper.GetUint("project")
}
