package commands

import (
	"fmt"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/spf13/cobra"
)

func registerCommand_PortForward(_ config.CLIConfig) *cobra.Command {
	portForwardCmd := &cobra.Command{
		Use: "port-forward [release] [LOCAL_PORT:]REMOTE_PORT [...[LOCAL_PORT_N:]REMOTE_PORT_N]",
		Deprecated: fmt.Sprintf("please use the %s command instead.",
			color.New(color.FgYellow, color.Bold).Sprintf("porter kubectl -- port-forward"),
		),
		DisableFlagParsing: true,
	}

	return portForwardCmd
}
