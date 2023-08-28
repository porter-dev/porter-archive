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
	cliErrors "github.com/porter-dev/porter/cli/cmd/errors"
)

var (
	ErrNotLoggedIn   error = errors.New("You are not logged in.")
	ErrCannotConnect error = errors.New("Unable to connect to the Porter server.")
)

type authenticatedRunnerFunc func(ctx context.Context, user *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, args []string) error

func checkLoginAndRunWithConfig(ctx context.Context, cliConf config.CLIConfig, args []string, runner authenticatedRunnerFunc) error {
	client, err := api.NewClientWithConfig(ctx, api.NewClientInput{
		BaseURL:        fmt.Sprintf("%s/api", cliConf.Host),
		BearerToken:    cliConf.Token,
		CookieFileName: "cookie.json",
	})
	if err != nil {
		return fmt.Errorf("error creating porter API client: %w", err)
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

		red.Fprintf(os.Stderr, "Error: %v\n", err.Error())
		return err
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

	err = runner(ctx, user, client, cliConf, flags, args)
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

		cliErrors.GetErrorHandler(cliConf).HandleError(err)

		return err
	}

	return nil
}
