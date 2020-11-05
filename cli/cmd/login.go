package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/cobra"
)

var (
	host string
)

// loginCmd represents the login command
var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authorizes a user for a given Porter server",
	Run: func(cmd *cobra.Command, args []string) {
		err := login(host)

		if err != nil {
			fmt.Println("Error logging in:", err.Error())
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(loginCmd)

	loginCmd.PersistentFlags().StringVar(
		&host,
		"host",
		"http://localhost:10000",
		"host url of Porter instance",
	)
}

func login(host string) error {
	var username, pw string

	fmt.Println("Please log in with an email and password:")

	username, err := promptPlaintext("Email: ")

	if err != nil {
		return err
	}

	pw, err = promptPasswordWithConfirmation()

	if err != nil {
		return err
	}

	client := api.NewClient(host+"/api", "cookie.json")

	_, err = client.Login(context.Background(), &api.LoginRequest{
		Email:    username,
		Password: pw,
	})

	if err != nil {
		return err
	}

	fmt.Println("Successfully logged in!")

	return nil
}
