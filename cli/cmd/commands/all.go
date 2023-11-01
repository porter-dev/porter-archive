package commands

import (
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/spf13/cobra"
)

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
