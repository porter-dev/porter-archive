package cmd

import (
	"context"
	"errors"
	"strings"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
)

var ErrNotLoggedIn error = errors.New("You are not logged in.")
var ErrCannotConnect error = errors.New("Unable to connect to the Porter server.")

func checkLoginAndRun(args []string, runner func(user *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error) error {
	client := GetAPIClient(config)

	user, err := client.AuthCheck(context.Background())

	if err != nil {
		red := color.New(color.FgRed)

		if strings.Contains(err.Error(), "Forbidden") {
			red.Print("You are not logged in. Log in using \"porter auth login\"\n")
			return ErrNotLoggedIn
		} else if strings.Contains(err.Error(), "connection refused") {
			red.Printf("Unable to connect to the Porter server at %s\n", config.Host)
			red.Print("To set a different host, run \"porter config set-host [HOST]\"\n")
			red.Print("To start a local server, run \"porter server start\"\n")
			return ErrCannotConnect
		}

		red.Printf("Error: %v\n", err.Error())
		return err
	}

	err = runner(user, client, args)

	if err != nil {
		red := color.New(color.FgRed)

		if strings.Contains(err.Error(), "403") {
			red.Print("You do not have the necessary permissions to view this resource")
			return nil
		} else if strings.Contains(err.Error(), "connection refused") {
			red.Printf("Unable to connect to the Porter server at %s\n", config.Host)
			red.Print("To set a different host, run \"porter config set-host [HOST]\"")
			red.Print("To start a local server, run \"porter server start\"")
			return nil
		}

		red.Printf("Error: %v\n", err.Error())
		return err
	}

	return nil
}
