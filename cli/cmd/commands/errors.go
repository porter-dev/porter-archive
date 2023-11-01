package commands

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	cliErrors "github.com/porter-dev/porter/cli/cmd/errors"
	"github.com/spf13/cobra"
)

var (
	ErrNotLoggedIn   error = errors.New("You are not logged in.")
	ErrCannotConnect error = errors.New("Unable to connect to the Porter server.")
)

type authenticatedRunnerFunc func(ctx context.Context, user *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, currentProfile string, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error

var errCreatingPorterAPIClient = errors.New("unable to authenticate against server")

func checkLoginAndRunWithConfig(cmd *cobra.Command, args []string, runner authenticatedRunnerFunc) error {
	ctx := cmd.Context()

	cliConf, currentProfile, err := currentProfileIncludingFlags(cmd)
	if err != nil {
		return fmt.Errorf("error whilst initialising config: %w", err)
	}

	client, err := api.NewClientWithConfig(ctx, api.NewClientInput{
		BaseURL:        fmt.Sprintf("%s/api", cliConf.Host),
		BearerToken:    cliConf.Token,
		CookieFileName: "cookie.json",
	})
	if err != nil {
		return errCreatingPorterAPIClient
	}

	user, err := client.AuthCheck(ctx)
	if err != nil {
		red := color.New(color.FgRed)

		if strings.Contains(err.Error(), "Forbidden") {
			red.Print("You are not logged in. Log in using \"porter auth login\"\n")
			return ErrNotLoggedIn
		} else if strings.Contains(err.Error(), "connection refused") {
			red.Printf("Unable to connect to the Porter server at %s\n", cliConf.Host)
			red.Print("To set a different host, run \"porter config set-host [HOST]\"\n")
			red.Print("To start a local server, run \"porter server start\"\n")
			return ErrCannotConnect
		}

		return fmt.Errorf("error checking login: %w", err)
	}

	project, err := client.GetProject(ctx, cliConf.Project)
	if err != nil {
		return fmt.Errorf("could not retrieve project from Porter API. Please contact support@porter.run: %w", err)
	}
	if project == nil {
		return fmt.Errorf("project [%d] not found", cliConf.Project)
	}

	flags := config.FeatureFlags{
		ValidateApplyV2Enabled: project.ValidateApplyV2,
	}

	err = runner(ctx, user, client, cliConf, currentProfile, flags, cmd, args)
	if err != nil {
		red := color.New(color.FgRed)

		if strings.Contains(err.Error(), "403") {
			red.Print("You do not have the necessary permissions to view this resource")
			return nil
		} else if strings.Contains(err.Error(), "connection refused") {
			red.Printf("Unable to connect to the Porter server at %s\n", cliConf.Host)
			red.Print("To set a different host, run \"porter config set-host [HOST]\"")
			red.Print("To start a local server, run \"porter server start\"")
			return nil
		}

		cliErrors.GetErrorHandler(cliConf, currentProfile).HandleError(err)

		return fmt.Errorf("error running command: %w", err)
	}

	return nil
}

// currentProfileIncludingFlags returns the current profile, and initialises the config.
// This ensures the the current profile is set to the one specified in the flags, env vars, or config in the correct order or precedence
func currentProfileIncludingFlags(cmd *cobra.Command) (config.CLIConfig, string, error) {
	ctx := cmd.Context()
	flagsConfig := parseRootConfigFlags(cmd)

	profile, err := cmd.Flags().GetString("profile")
	if err != nil {
		return config.CLIConfig{}, "", fmt.Errorf("error getting profile flag: %w", err)
	}

	cliConfig, currentProfile, err := config.InitAndLoadConfig(ctx, profile, flagsConfig)
	if err != nil {
		return config.CLIConfig{}, "", fmt.Errorf("error whilst initialising config: %w", err)
	}
	return cliConfig, currentProfile, nil
}
