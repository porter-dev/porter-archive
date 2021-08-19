package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

// Version will be linked by an ldflag during build
var Version string = "v0.8.0"

var versionCmd = &cobra.Command{
	Use:     "version",
	Aliases: []string{"v", "--version"},
	Short:   "Prints the version of the Porter CLI",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(Version)
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
