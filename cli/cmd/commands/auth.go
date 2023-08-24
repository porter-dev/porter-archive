package commands

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/fatih/color"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	loginBrowser "github.com/porter-dev/porter/cli/cmd/login"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
)

var manual bool = false

func registerCommand_Auth(cliConf config.CLIConfig) *cobra.Command {
	authCmd := &cobra.Command{
		Use:   "auth",
		Short: "Commands for authenticating to a Porter server",
	}

	loginCmd := &cobra.Command{
		Use:   "login",
		Short: "Authorizes a user for a given Porter server",
		Run: func(cmd *cobra.Command, args []string) {
			err := login(cmd.Context(), cliConf)
			if err != nil {
				color.Red("Error logging in: %s\n", err.Error())
				os.Exit(1)
			}
		},
	}

	registerCmd := &cobra.Command{
		Use:   "register",
		Short: "Creates a user for a given Porter server",
		Run: func(cmd *cobra.Command, args []string) {
			err := register(cmd.Context(), cliConf)
			if err != nil {
				color.Red("Error registering: %s\n", err.Error())
				os.Exit(1)
			}
		},
	}

	logoutCmd := &cobra.Command{
		Use:   "logout",
		Short: "Logs a user out of a given Porter server",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd.Context(), cliConf, args, logout)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	authCmd.AddCommand(loginCmd)
	authCmd.AddCommand(registerCmd)
	authCmd.AddCommand(logoutCmd)

	loginCmd.PersistentFlags().BoolVar(
		&manual,
		"manual",
		false,
		"whether to prompt for manual authentication (username/pw)",
	)

	return authCmd
}

func login(ctx context.Context, cliConf config.CLIConfig) error {
	client, err := api.NewClientWithConfig(ctx, api.NewClientInput{
		BaseURL:     fmt.Sprintf("%s/api", cliConf.Host),
		BearerToken: cliConf.Token,
	})
	if err != nil {
		if !errors.Is(err, api.ErrNoAuthCredential) {
			return fmt.Errorf("error creating porter API client: %w", err)
		}
	}

	user, err := client.AuthCheck(ctx)
	if err != nil {
		if !strings.Contains(err.Error(), "Forbidden") {
			return fmt.Errorf("unexpected error performing authorization check")
		}
		fmt.Println(err)
	}

	if cliConf.Token == "" {
		// check for the --manual flag
		if manual {
			return loginManual(ctx, cliConf, client)
		}

		// log the user in
		token, err := loginBrowser.Login(cliConf.Host)
		if err != nil {
			return err
		}

		// set the token in config
		err = cliConf.SetToken(token)

		if err != nil {
			return err
		}

		client, err = api.NewClientWithConfig(ctx, api.NewClientInput{
			BaseURL:     fmt.Sprintf("%s/api", cliConf.Host),
			BearerToken: token,
		})
		if err != nil {
			return fmt.Errorf("error creating porter API client: %w", err)
		}

		user, err = client.AuthCheck(ctx)

		if err != nil {
			color.Red("Invalid token.")
			return err
		}

		_, _ = color.New(color.FgGreen).Println("Successfully logged in!")

		return setProjectForUser(ctx, client, cliConf, user.ID)

	}

	err = cliConf.SetToken(cliConf.Token)
	if err != nil {
		return err
	}
	_, _ = color.New(color.FgGreen).Println("Successfully logged in!")

	projID, exists, err := api.GetProjectIDFromToken(cliConf.Token)
	if err != nil {
		return err
	}

	// if project ID does not exist for the token, this is a user-issued CLI token, so the project
	// ID should be queried
	if !exists {
		err = setProjectForUser(ctx, client, cliConf, user.ID)

		if err != nil {
			return err
		}
	} else {
		// if the project ID does exist for the token, this is a project-issued token, and
		// the project should be set automatically
		err = cliConf.SetProject(ctx, client, projID)

		if err != nil {
			return err
		}

		err = setProjectCluster(ctx, client, cliConf, projID)

		if err != nil {
			return err
		}
	}
	return nil
}

func setProjectForUser(ctx context.Context, client api.Client, config config.CLIConfig, _ uint) error {
	// get a list of projects, and set the current project
	resp, err := client.ListUserProjects(ctx)
	if err != nil {
		return err
	}

	projects := *resp

	if len(projects) > 0 {
		config.SetProject(ctx, client, projects[0].ID) //nolint:errcheck,gosec // do not want to change logic of CLI. New linter error

		err = setProjectCluster(ctx, client, config, projects[0].ID)

		if err != nil {
			return err
		}
	}

	return nil
}

func loginManual(ctx context.Context, cliConf config.CLIConfig, client api.Client) error {
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

	_, err = client.Login(ctx, &types.LoginUserRequest{
		Email:    username,
		Password: pw,
	})

	if err != nil {
		return err
	}

	// set the token to empty since this is manual (cookie-based) login
	cliConf.SetToken("")

	color.New(color.FgGreen).Println("Successfully logged in!")

	// get a list of projects, and set the current project
	resp, err := client.ListUserProjects(ctx)
	if err != nil {
		return err
	}

	projects := *resp

	if len(projects) > 0 {
		cliConf.SetProject(ctx, client, projects[0].ID) //nolint:errcheck,gosec // do not want to change logic of CLI. New linter error

		err = setProjectCluster(ctx, client, cliConf, projects[0].ID)

		if err != nil {
			return err
		}
	}

	return nil
}

func register(ctx context.Context, cliConf config.CLIConfig) error {
	client, err := api.NewClientWithConfig(ctx, api.NewClientInput{
		BaseURL:     fmt.Sprintf("%s/api", cliConf.Host),
		BearerToken: cliConf.Token,
	})
	if err != nil {
		if !errors.Is(err, api.ErrNoAuthCredential) {
			return fmt.Errorf("error creating porter API client: %w", err)
		}
	}

	fmt.Println("Please register your admin account with an email and password:")

	username, err := utils.PromptPlaintext("Email: ")
	if err != nil {
		return err
	}

	pw, err := utils.PromptPasswordWithConfirmation()
	if err != nil {
		return err
	}

	resp, err := client.CreateUser(ctx, &types.CreateUserRequest{
		Email:    username,
		Password: pw,
	})
	if err != nil {
		return err
	}

	color.New(color.FgGreen).Printf("Created user with email %s and id %d\n", username, resp.ID)

	return nil
}

func logout(ctx context.Context, user *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, args []string) error {
	err := client.Logout(ctx)
	if err != nil {
		return err
	}

	cliConf.SetToken("")

	color.Green("Successfully logged out")

	return nil
}
