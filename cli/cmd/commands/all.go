package commands

import (
	"fmt"

	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
)

// RegisterCommands initiates config and sets up all commands.
// Error returned here is a placeholder as the register commands do not currently return errors, and handle exits themselves. This may change at a later date.
func RegisterCommands() (*cobra.Command, error) {
	cliConf, err := config.InitAndLoadConfig()
	if err != nil {
		return nil, fmt.Errorf("error loading porter config: %w", err)
	}

	rootCmd := &cobra.Command{
		Use:   "porter",
		Short: "Porter is a dashboard for managing Kubernetes clusters.",
		Long:  `Porter is a tool for creating, versioning, and updating Kubernetes deployments using a visual dashboard. For more information, visit github.com/porter-dev/porter`,
	}
	rootCmd.PersistentFlags().AddFlagSet(utils.DefaultFlagSet)

	rootCmd.AddCommand(registerCommand_App(cliConf))
	rootCmd.AddCommand(registerCommand_Apply(cliConf))
	rootCmd.AddCommand(registerCommand_Auth(cliConf))
	rootCmd.AddCommand(registerCommand_Cluster(cliConf))
	rootCmd.AddCommand(registerCommand_Config(cliConf))
	rootCmd.AddCommand(registerCommand_Connect(cliConf))
	rootCmd.AddCommand(registerCommand_Create(cliConf))
	rootCmd.AddCommand(registerCommand_Delete(cliConf))
	rootCmd.AddCommand(registerCommand_Deploy(cliConf))
	rootCmd.AddCommand(registerCommand_Docker(cliConf))
	rootCmd.AddCommand(registerCommand_Get(cliConf))
	rootCmd.AddCommand(registerCommand_Helm(cliConf))
	rootCmd.AddCommand(registerCommand_Job(cliConf))
	rootCmd.AddCommand(registerCommand_Kubectl(cliConf))
	rootCmd.AddCommand(registerCommand_List(cliConf))
	rootCmd.AddCommand(registerCommand_Logs(cliConf))
	rootCmd.AddCommand(registerCommand_Open(cliConf))
	rootCmd.AddCommand(registerCommand_PortForward(cliConf))
	rootCmd.AddCommand(registerCommand_Project(cliConf))
	rootCmd.AddCommand(registerCommand_Registry(cliConf))
	rootCmd.AddCommand(registerCommand_Run(cliConf))
	rootCmd.AddCommand(registerCommand_Server(cliConf))
	rootCmd.AddCommand(registerCommand_Stack(cliConf))
	rootCmd.AddCommand(registerCommand_Update(cliConf))
	rootCmd.AddCommand(registerCommand_Version(cliConf))
	rootCmd.AddCommand(registerCommand_Env(cliConf))
	return rootCmd, nil
}

// overrideConfigWithFlags grabs the runtime value of registered flags, and overrides the values in CLIConfig.
// It was done this way to reduce the size of a refactor, as the codebase conflates initialisation of the commands, with the runtime values.
func overrideConfigWithFlags(cmd *cobra.Command, config config.CLIConfig) config.CLIConfig {
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
