package cmd

import (
	"fmt"

	"github.com/porter-dev/porter/cmd/cli/cmd/credstore"

	"github.com/spf13/cobra"
)

// startCmd represents the start command
var startCmd = &cobra.Command{
	Args: func(cmd *cobra.Command, args []string) error {
		return nil
	},
	Use:   "start",
	Short: "Starts a Porter instance using the Docker engine.",
	Run: func(cmd *cobra.Command, args []string) {
		var username, pw string
		var err error

		// if not insecure, or username/pw set incorrectly, prompt for new username/pw
		if username, pw, err = credstore.Get(); !cmd.Flag("insecure").Changed && err != nil {
			username, err = promptPlaintext("Email: ")

			if err != nil {
				fmt.Println(err.Error())
				return
			}

			pw, err = promptPasswordWithConfirmation()

			if err != nil {
				fmt.Println(err.Error())
				return
			}

			credstore.Set(username, pw)
		}

		// start()
	},
}

func init() {
	// closeHandler(stop)
	rootCmd.AddCommand(startCmd)
	startCmd.PersistentFlags().Bool("insecure", false, "skip admin setup and authorization")
}
