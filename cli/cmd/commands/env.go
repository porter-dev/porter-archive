package commands

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/server/handlers/environment_groups"
	"github.com/porter-dev/porter/api/server/handlers/porter_app"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/spf13/cobra"
)

var (
	appName      string
	envGroupName string
	envFilePath  string
)

type envVariables struct {
	Variables map[string]string `json:"variables"`
	Secrets   map[string]string `json:"secrets"`
}

type envVariableDeletions struct {
	Variables []string `json:"variables"`
	Secrets   []string `json:"secrets"`
}

func registerCommand_Env(cliConf config.CLIConfig) *cobra.Command {
	envCmd := &cobra.Command{
		Use:   "env",
		Args:  cobra.MinimumNArgs(0),
		Short: "Manage environment variables for a project",
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			if len(cmd.Commands()) == 1 {
				return nil
			}

			if appName == "" && envGroupName == "" {
				return fmt.Errorf("must specify either --app or --group")
			}
			if appName != "" && envGroupName != "" {
				return fmt.Errorf("only one of --app or --group can be specified")
			}

			return nil
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			return cmd.Help()
		},
	}

	envCmd.PersistentFlags().StringVarP(&appName, "app", "a", "", "app name")
	envCmd.PersistentFlags().StringVarP(&envGroupName, "group", "g", "", "environment group name")
	envCmd.PersistentFlags().StringVarP(&deploymentTargetName, "target", "x", "", "the name of the deployment target for the app")

	pullCommand := &cobra.Command{
		Use:   "pull",
		Short: "Pull environment variables for an app or environment group",
		Long: `Pull environment variables for an app or environment group. 

Optionally, specify a file to write the environment variables to. Otherwise the environment variables will be written to stdout.`,
		Args: cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			return checkLoginAndRunWithConfig(cmd, cliConf, args, pullEnv)
		},
	}
	pullCommand.Flags().StringVarP(&envFilePath, "file", "f", "", "file to write environment variables to")

	setCommand := &cobra.Command{
		Use:   "set",
		Short: "Set environment variables for an app or environment group",
		Long: `Set environment variables for an app or environment group.

Both variables and secrets can be specified as key-value pairs.
When updating an environment group, all apps linked to the environment group will be re-deployed, unless the --skip-redeploys flag is used.`,
		Args: cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			return checkLoginAndRunWithConfig(cmd, cliConf, args, setEnv)
		},
	}
	setCommand.Flags().StringToStringP("variables", "v", nil, "variables to set")
	setCommand.Flags().StringToStringP("secrets", "s", nil, "secrets to set")
	setCommand.Flags().Bool("skip-redeploys", false, "skip re-deploying apps linked to the environment group")

	unsetCommand := &cobra.Command{
		Use:   "unset",
		Short: "Unset environment variables for an app or environment group",
		Long: `Unset environment variables for an app or environment group.

Both variables and secrets can be specified as keys.
When updating an environment group, all apps linked to the environment group will be re-deployed, unless the --skip-redeploys flag is used.`,
		Args: cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			return checkLoginAndRunWithConfig(cmd, cliConf, args, unsetEnv)
		},
	}
	unsetCommand.Flags().StringSliceP("variables", "v", nil, "variables to unset")
	unsetCommand.Flags().StringSliceP("secrets", "s", nil, "secrets to unset")
	unsetCommand.Flags().Bool("skip-redeploys", false, "skip re-deploying apps linked to the environment group")

	envCmd.AddCommand(pullCommand)
	envCmd.AddCommand(setCommand)
	envCmd.AddCommand(unsetCommand)

	return envCmd
}

func pullEnv(ctx context.Context, user *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	var envVars envVariables

	if appName != "" {
		color.New(color.FgGreen).Printf("Pulling environment variables for app %s...\n", appName) // nolint:errcheck,gosec

		envVarsResp, err := client.GetAppEnvVariables(ctx, cliConf.Project, cliConf.Cluster, appName, deploymentTargetName)
		if err != nil {
			return fmt.Errorf("could not get app env variables: %w", err)
		}
		if envVarsResp == nil {
			return fmt.Errorf("could not get app env variables: response was nil")
		}

		envVars = envVariables{
			Variables: envVarsResp.EnvVariables.Variables,
			Secrets:   envVarsResp.EnvVariables.Secrets,
		}
	}

	if envGroupName != "" {
		color.New(color.FgGreen).Printf("Pulling environment variables for environment group %s...\n", envGroupName) // nolint:errcheck,gosec

		envVarsResp, err := client.GetLatestEnvGroupVariables(ctx, cliConf.Project, cliConf.Cluster, envGroupName)
		if err != nil {
			return fmt.Errorf("could not get env group env variables: %w", err)
		}
		if envVarsResp == nil {
			return fmt.Errorf("could not get env group variables: response was nil")
		}

		envVars = envVariables{
			Variables: envVarsResp.Variables,
			Secrets:   envVarsResp.Secrets,
		}
	}

	if envFilePath != "" {
		err := writeEnvFile(envFilePath, envVars)
		if err != nil {
			return fmt.Errorf("could not write env file: %w", err)
		}
		color.New(color.FgGreen).Printf("Wrote environment variables to %s\n", envFilePath) // nolint:errcheck,gosec
	}

	if envFilePath == "" {
		err := exportEnvVars(envVars)
		if err != nil {
			return fmt.Errorf("could not export env vars: %w", err)
		}
	}

	return nil
}

func setEnv(ctx context.Context, user *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	var envVars envVariables

	variables, err := cmd.Flags().GetStringToString("variables")
	if err != nil {
		return fmt.Errorf("could not get variables: %w", err)
	}

	secrets, err := cmd.Flags().GetStringToString("secrets")
	if err != nil {
		return fmt.Errorf("could not get secrets: %w", err)
	}

	skipRedeploys, err := cmd.Flags().GetBool("skip-redeploys")
	if err != nil {
		return fmt.Errorf("could not get skip-redeploys: %w", err)
	}

	envVars = envVariables{
		Variables: variables,
		Secrets:   secrets,
	}

	s := spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	s.Color("cyan") // nolint:errcheck,gosec

	if appName != "" {
		s.Suffix = fmt.Sprintf(" Setting environment variables for app %s...", appName)

		s.Start()
		_, err := client.UpdateApp(ctx, api.UpdateAppInput{
			ProjectID:            cliConf.Project,
			ClusterID:            cliConf.Cluster,
			Name:                 appName,
			DeploymentTargetName: deploymentTargetName,
			Variables:            envVars.Variables,
			Secrets:              envVars.Secrets,
		})
		if err != nil {
			return fmt.Errorf("could not set app env variables: %w", err)
		}
		s.Stop()

		color.New(color.FgGreen).Printf("Updated environment variable keys in app %s:\n", appName) // nolint:errcheck,gosec
	}

	if envGroupName != "" {
		s.Suffix = fmt.Sprintf(" Setting environment variables for environment group %s...", envGroupName)

		s.Start()
		err := client.UpdateEnvGroup(ctx, api.UpdateEnvGroupInput{
			ProjectID:     cliConf.Project,
			ClusterID:     cliConf.Cluster,
			EnvGroupName:  envGroupName,
			Variables:     envVars.Variables,
			Secrets:       envVars.Secrets,
			SkipRedeploys: skipRedeploys,
		})
		if err != nil {
			return fmt.Errorf("could not set env group env variables: %w", err)
		}
		s.Stop()

		color.New(color.FgGreen).Printf("Updated keys in environment group %s:\n", envGroupName) // nolint:errcheck,gosec
	}

	for k, v := range envVars.Variables {
		color.New(color.FgBlue).Printf("%s=%s\n", k, v) // nolint:errcheck,gosec
	}
	for k := range envVars.Secrets {
		color.New(color.FgBlue).Printf("%s=********\n", k) // nolint:errcheck,gosec
	}

	return nil
}

func unsetEnv(ctx context.Context, user *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	var envVarDeletions envVariableDeletions

	variables, err := cmd.Flags().GetStringSlice("variables")
	if err != nil {
		return fmt.Errorf("could not get variables: %w", err)
	}

	secrets, err := cmd.Flags().GetStringSlice("secrets")
	if err != nil {
		return fmt.Errorf("could not get secrets: %w", err)
	}

	skipRedeploys, err := cmd.Flags().GetBool("skip-redeploys")
	if err != nil {
		return fmt.Errorf("could not get skip-redeploys: %w", err)
	}

	envVarDeletions = envVariableDeletions{
		Variables: variables,
		Secrets:   secrets,
	}

	s := spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	s.Color("cyan") // nolint:errcheck,gosec

	if appName != "" {
		s.Suffix = fmt.Sprintf(" Unsetting environment variables for app %s...", appName)

		s.Start()
		_, err := client.UpdateApp(ctx, api.UpdateAppInput{
			ProjectID:            cliConf.Project,
			ClusterID:            cliConf.Cluster,
			Name:                 appName,
			DeploymentTargetName: deploymentTargetName,
			Deletions: porter_app.Deletions{
				EnvVariableDeletions: porter_app.EnvVariableDeletions{
					Variables: envVarDeletions.Variables,
					Secrets:   envVarDeletions.Secrets,
				},
			},
		})
		if err != nil {
			return fmt.Errorf("could not unset app env variables: %w", err)
		}
		s.Stop()

		color.New(color.FgGreen).Printf("Unset environment variable keys in app %s:\n", appName) // nolint:errcheck,gosec
	}

	if envGroupName != "" {
		s.Suffix = fmt.Sprintf(" Unsetting environment variables for environment group %s...", envGroupName)

		err := client.UpdateEnvGroup(ctx, api.UpdateEnvGroupInput{
			ProjectID:    cliConf.Project,
			ClusterID:    cliConf.Cluster,
			EnvGroupName: envGroupName,
			Deletions: environment_groups.EnvVariableDeletions{
				Variables: envVarDeletions.Variables,
				Secrets:   envVarDeletions.Secrets,
			},
			SkipRedeploys: skipRedeploys,
		})
		if err != nil {
			return fmt.Errorf("could not unset env group env variables: %w", err)
		}

		color.New(color.FgGreen).Printf("Unset the keys in environment group %s:\n", envGroupName) // nolint:errcheck,gosec
	}

	for _, v := range envVarDeletions.Variables {
		color.New(color.FgBlue).Printf("%s\n", v) // nolint:errcheck,gosec
	}
	for _, v := range envVarDeletions.Secrets {
		color.New(color.FgBlue).Printf("%s\n", v) // nolint:errcheck,gosec
	}

	return nil
}

func writeEnvFile(envFilePath string, envVars envVariables) error {
	// open existing file or create new file: https://pkg.go.dev/os#example-OpenFile-Append
	envFile, err := os.OpenFile(envFilePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644) // nolint:gosec
	if err != nil {
		return err
	}
	defer envFile.Close() // nolint:errcheck

	_, err = envFile.WriteString("# Generated by Porter CLI\n")
	if err != nil {
		return err
	}

	for k, v := range envVars.Variables {
		_, err := envFile.WriteString(fmt.Sprintf("%s=%s\n", k, v))
		if err != nil {
			return err
		}
	}

	for k, v := range envVars.Secrets {
		_, err := envFile.WriteString(fmt.Sprintf("%s=%s\n", k, v))
		if err != nil {
			return err
		}
	}

	return nil
}

func exportEnvVars(envVars envVariables) error {
	for k, v := range envVars.Variables {
		_, err := os.Stdout.WriteString(fmt.Sprintf("%s=%s\n", k, v))
		if err != nil {
			return err
		}
	}

	for k, v := range envVars.Secrets {
		_, err := os.Stdout.WriteString(fmt.Sprintf("%s=%s\n", k, v))
		if err != nil {
			return err
		}
	}

	return nil
}
