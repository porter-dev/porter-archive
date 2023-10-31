package commands

import (
	"errors"
	"fmt"

	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
)

func rootFunc(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()

	flagsConfig := parseRootConfigFlags(cmd)

	profile, err := cmd.Flags().GetString("profile")
	if err != nil {
		return fmt.Errorf("error getting profile flag: %w", err)
	}

	cliConf, currentProfile, err := config.InitAndLoadConfig(ctx, profile, flagsConfig)
	if err != nil {
		fmt.Println("unwrapped", errors.Unwrap(err))
		return fmt.Errorf("error whilst initialising config: %w", err)
	}

	cmd.PersistentFlags().AddFlagSet(utils.DefaultFlagSet)
	cmd.AddCommand(registerCommand_App(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Apply(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Auth(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Cluster(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Config(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Connect(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Create(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Delete(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Deploy(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Docker(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Get(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Helm(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Job(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Kubectl(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_List(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Logs(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Open(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_PortForward(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Project(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Registry(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Run(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Server(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Stack(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Update(cliConf, currentProfile))
	cmd.AddCommand(registerCommand_Version(cliConf, currentProfile))
	return nil
}

// parseRootConfigFlags grabs the runtime value of registered  root level persisted flags.
func parseRootConfigFlags(cmd *cobra.Command) config.CLIConfig {
	type flag struct {
		// stringName is the name of the flag which is a string
		stringName string
		// stringConfigTarget is the pointer to the string in the config struct
		stringConfigTarget *string

		// uintName is the name of the flag which is a uint
		uintName string
		// uintConfigTarget is the pointer to the uint in the config struct
		uintConfigTarget *uint
	}

	var profile string
	var config config.CLIConfig

	flagsToOverride := []flag{
		{
			stringName:         "driver",
			stringConfigTarget: &config.Driver,
		},
		{
			stringName:         "host",
			stringConfigTarget: &config.Host,
		},
		{
			stringName:         "token",
			stringConfigTarget: &config.Token,
		},
		{
			stringName:         "kubeconfig",
			stringConfigTarget: &config.Kubeconfig,
		},
		{
			stringName:         "profile",
			stringConfigTarget: &profile,
		},
		{
			uintName:         "project",
			uintConfigTarget: &config.Project,
		},
		{
			uintName:         "cluster",
			uintConfigTarget: &config.Cluster,
		},
		{
			uintName:         "registry",
			uintConfigTarget: &config.Registry,
		},
		{
			uintName:         "helm_repo",
			uintConfigTarget: &config.HelmRepo,
		},
	}
	for _, fl := range flagsToOverride {
		if fl.stringName != "" {
			st, _ := cmd.Flags().GetString(fl.stringName)
			if st != "" {
				*fl.stringConfigTarget = st
			}
		}
		if fl.uintName != "" {
			ui, _ := cmd.Flags().GetUint(fl.uintName)
			if ui != 0 {
				*fl.uintConfigTarget = ui
			}
		}
	}
	return config
}
