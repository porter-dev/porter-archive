package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/fatih/color"

	"github.com/porter-dev/porter/cli/cmd/api"
	loginBrowser "github.com/porter-dev/porter/cli/cmd/login"
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
			color.Red("Error logging in:", err.Error())
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
			color.Red("Error registering:", err.Error())
			os.Exit(1)
		}
	},
}

var logoutCmd = &cobra.Command{
	Use:   "logout",
	Short: "Logs a user out of a given Porter server",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, logout)

		if err != nil {
			os.Exit(1)
		}
	},
}

var token string = ""
var manual bool = false

func init() {
	rootCmd.AddCommand(authCmd)

	authCmd.AddCommand(loginCmd)
	authCmd.AddCommand(registerCmd)
	authCmd.AddCommand(logoutCmd)

	loginCmd.PersistentFlags().BoolVar(
		&manual,
		"manual",
		false,
		"whether to prompt for manual authentication (username/pw)",
	)
}

func login() error {
	client := api.NewClientWithToken(config.Host+"/api", config.Token)

	user, _ := client.AuthCheck(context.Background())

	if user != nil {
		if config.Token != "" {
			// set the token if the user calls login with the --token flag
			config.SetToken(config.Token)
			color.New(color.FgGreen).Println("Successfully logged in!")

			projID, err := api.GetProjectIDFromToken(token)

			if err != nil {
				return err
			}

			config.SetProject(projID)
		} else {
			color.Yellow("You are already logged in. If you'd like to log out, run \"porter auth logout\".")
		}

		return nil
	}

	// check for the --manual flag
	if manual {
		return loginManual()
	}

	// check for a token
	var err error

	if token == "" {
		token, err = loginBrowser.Login(config.Host)

		if err != nil {
			return err
		}

		// set the token in config
		err = config.SetToken(token)

		if err != nil {
			return err
		}

		client := api.NewClientWithToken(config.Host+"/api", token)

		user, err := client.AuthCheck(context.Background())

		if user == nil {
			color.Red("Invalid token.")
			return err
		}

		color.New(color.FgGreen).Println("Successfully logged in!")

		// get a list of projects, and set the current project
		projects, err := client.ListUserProjects(context.Background(), user.ID)

		if err != nil {
			return err
		}

		if len(projects) > 0 {
			config.SetProject(projects[0].ID)
		}
	} else {
		// set the token in config
		err = config.SetToken(token)

		if err != nil {
			return err
		}

		client := api.NewClientWithToken(config.Host+"/api", token)

		user, err := client.AuthCheck(context.Background())

		if user == nil {
			color.Red("Invalid token.")
			return err
		}

		color.New(color.FgGreen).Println("Successfully logged in!")

		projID, err := api.GetProjectIDFromToken(token)

		if err != nil {
			return err
		}

		config.SetProject(projID)
	}

	return nil
}

func loginManual() error {
	client := api.NewClient(config.Host+"/api", "cookie.json")

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

	_user, err := client.Login(context.Background(), &api.LoginRequest{
		Email:    username,
		Password: pw,
	})

	if err != nil {
		return err
	}

	// set the token to empty since this is manual (cookie-based) login
	config.SetToken("")

	color.New(color.FgGreen).Println("Successfully logged in!")

	// get a list of projects, and set the current project
	projects, err := client.ListUserProjects(context.Background(), _user.ID)

	if err != nil {
		return err
	}

	if len(projects) > 0 {
		config.SetProject(projects[0].ID)
	}

	return nil
}

func register() error {
	fmt.Println("Please register your admin account with an email and password:")

	username, err := utils.PromptPlaintext("Email: ")

	if err != nil {
		return err
	}

	pw, err := utils.PromptPasswordWithConfirmation()

	if err != nil {
		return err
	}

	client := GetAPIClient(config)

	resp, err := client.CreateUser(context.Background(), &api.CreateUserRequest{
		Email:    username,
		Password: pw,
	})

	if err != nil {
		return err
	}

	color.New(color.FgGreen).Printf("Created user with email %s and id %d\n", username, resp.ID)

	return nil
}

func logout(user *api.AuthCheckResponse, client *api.Client, args []string) error {
	err := client.Logout(context.Background())

	if err != nil {
		return err
	}

	config.SetToken("")

	color.Green("Successfully logged out")

	return nil
}
