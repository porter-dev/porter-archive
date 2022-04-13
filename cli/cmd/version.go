package cmd

import (
	"fmt"

	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/spf13/cobra"
)

var versionCmd = &cobra.Command{
	Use:     "version",
	Aliases: []string{"v", "--version"},
	Short:   "Prints the version of the Porter CLI",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(config.Version)
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
