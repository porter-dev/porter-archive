package cmd

import (
	"context"
	"strings"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
)

func checkLoginAndRun(args []string, runner func(user *api.AuthCheckResponse, client *api.Client, args []string) error) error {
	client := GetAPIClient(config)

	user, err := client.AuthCheck(context.Background())

	if err != nil {
		red := color.New(color.FgRed)

		if strings.Contains(err.Error(), "403") {
			red.Print("You are not logged in. Log in using \"porter auth login\"\n")
			return nil
		} else if strings.Contains(err.Error(), "connection refused") {
			red.Printf("Unable to connect to the Porter server at %s\n", config.Host)
			red.Print("To set a different host, run \"porter config set-host [HOST]\"\n")
			red.Print("To start a local server, run \"porter server start\"\n")
			return nil
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
