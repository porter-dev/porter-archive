package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
)

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "Commands for authenticating to a Porter server",
}

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authorizes a user for a given Porter server",
	Run: func(cmd *cobra.Command, args []string) {
		err := login()

		if err != nil {
			fmt.Println("Error logging in:", err.Error())
			os.Exit(1)
		}
	},
}

var registerCmd = &cobra.Command{
	Use:   "register",
	Short: "Creates a user for a given Porter server",
	Run: func(cmd *cobra.Command, args []string) {
		err := register()

		if err != nil {
			fmt.Println("Error registering:", err.Error())
			os.Exit(1)
		}
	},
}

var logoutCmd = &cobra.Command{
	Use:   "logout",
	Short: "Logs a user out of a given Porter server",
	Run: func(cmd *cobra.Command, args []string) {
		err := logout()

		if err != nil {
			fmt.Println("Error logging out:", err.Error())
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(authCmd)

	authCmd.AddCommand(loginCmd)
	authCmd.AddCommand(registerCmd)
	authCmd.AddCommand(logoutCmd)

	authCmd.PersistentFlags().StringVar(
		&host,
		"host",
		getHost(),
		"host url of Porter instance",
	)
}

func login() error {
	host := getHost()
	var username, pw string

	fmt.Println("Please log in with an email and password:")

	username, err := utils.PromptPlaintext("Email: ")

	if err != nil {
		return err
	}

	pw, err = utils.PromptPassword("Password: ")

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

func register() error {
	host := getHost()

	fmt.Println("Please register your admin account with an email and password:")

	username, err := utils.PromptPlaintext("Email: ")

	if err != nil {
		return err
	}

	pw, err := utils.PromptPasswordWithConfirmation()

	if err != nil {
		return err
	}

	client := api.NewClient(host+"/api", "cookie.json")

	resp, err := client.CreateUser(context.Background(), &api.CreateUserRequest{
		Email:    username,
		Password: pw,
	})

	if err != nil {
		return err
	}

	fmt.Printf("Created user with email %s and id %d\n", username, resp.ID)

	return nil
}

func logout() error {
	host := getHost()

	client := api.NewClient(host+"/api", "cookie.json")

	err := client.Logout(context.Background())

	if err != nil {
		return err
	}

	fmt.Println("Successfully logged out")

	return nil
}
