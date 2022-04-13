package cmd

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/utils"

	"github.com/spf13/cobra"
)

var openCmd = &cobra.Command{
	Use:   "open",
	Short: "Opens the browser at the currently set Porter instance",
	Run: func(cmd *cobra.Command, args []string) {
		client := config.GetAPIClient()

		user, err := client.AuthCheck(context.Background())

		if err == nil {
			utils.OpenBrowser(fmt.Sprintf("%s/login?email=%s", cliConf.Host, user.Email))
		} else {
			utils.OpenBrowser(fmt.Sprintf("%s/register", cliConf.Host))
		}
	},
}

func init() {
	rootCmd.AddCommand(openCmd)
}
