package v2

import (
	"context"
	"fmt"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
)

// UpdateFull implements the functionality of the `porter build` command for validate apply v2 projects
func UpdateFull(ctx context.Context, cliConf config.CLIConfig, client api.Client, appName string) error {
	// use empty string for porterYamlPath,legacy projects wont't have a v2 porter.yaml
	var porterYamlPath string

	inp := ApplyInput{
		CLIConfig:      cliConf,
		Client:         client,
		PorterYamlPath: porterYamlPath,
		AppName:        appName,
	}

	err := Apply(ctx, inp)
	if err != nil {
		return err
	}

	return nil
}

// UpdateBuild implements the functionality of the `porter apply` command for validate apply v2 projects
func UpdateBuild(ctx context.Context) error {
	fmt.Println("This command is not supported for your project. Contact support@porter.run for more information.")
	return nil
}

// UpdateUpgrade implements the functionality of the `porter config` command for validate apply v2 projects
func UpdateUpgrade(ctx context.Context) error {
	fmt.Println("This command is not supported for your project. Contact support@porter.run for more information.")
	return nil
}
