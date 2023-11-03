package commands

import (
	"context"
	"fmt"
	"os"
	"runtime"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/fatih/color"
	"github.com/google/go-github/v41/github"
	cfg "github.com/porter-dev/porter/cli/cmd/config"
	"github.com/spf13/cobra"
	"k8s.io/client-go/util/homedir"
)

var home = homedir.HomeDir()

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute(ctx context.Context) error {
	if cfg.Version != "dev" {
		ghClient := github.NewClient(nil)
		ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		release, _, err := ghClient.Repositories.GetLatestRelease(ctx, "porter-dev", "porter")
		if err == nil {
			release.GetURL()
			// we do not care for an error here because we do not want to block the user here
			constraint, err := semver.NewConstraint(fmt.Sprintf("> %s", strings.TrimPrefix(cfg.Version, "v")))
			if err == nil {
				latestRelease, err := semver.NewVersion(strings.TrimPrefix(release.GetTagName(), "v"))
				if err == nil {
					if constraint.Check(latestRelease) {
						color.New(color.FgYellow).Fprint(os.Stderr, "A new version of the porter CLI is available. Run the following to update: ")
						if runtime.GOOS == "darwin" {
							color.New(color.FgYellow, color.Bold).Fprintln(os.Stderr, "brew install porter-dev/porter/porter")
						} else {
							color.New(color.FgYellow, color.Bold).Fprintln(os.Stderr, "/bin/bash -c \"$(curl -fsSL https://install.porter.run)\"")
						}
						color.New(color.FgYellow).Fprintf(os.Stderr, "View CLI installation and upgrade docs at https://docs.porter.run/cli/installation\n\n")
					}
				}
			}
		}
	}

	rootCmd := &cobra.Command{
		Use:   "porter",
		Short: "Porter is a dashboard for managing Kubernetes clusters.",
		Long:  `Porter is a tool for creating, versioning, and updating Kubernetes deployments using a visual dashboard. For more information, visit github.com/porter-dev/porter`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return cmd.Help()
		},
	}

	err := registerRootCommands(rootCmd, nil)
	if err != nil {
		return fmt.Errorf("error registering root commands: %w", err)
	}

	// we shouldnt set default values in flags or they will overwrite all other values.
	// These should be set in defaultCLIConfig
	rootCmd.PersistentFlags().String("driver", "", "driver to use (local or docker)")
	rootCmd.PersistentFlags().String("host", "", "url of the porter instance to use")
	rootCmd.PersistentFlags().String("token", "", "token used for authentication")
	rootCmd.PersistentFlags().String("profile", "", "name of the profile to use with the CLI")
	rootCmd.PersistentFlags().Uint("project", 0, "project ID of the porter project to target")
	rootCmd.PersistentFlags().Uint("cluster", 0, "cluster ID of the porter cluster to target")
	rootCmd.PersistentFlags().Uint("registry", 0, "registry ID of connected Porter registry")
	rootCmd.PersistentFlags().Uint("helmrepo", 0, "helm repo ID of connected Porter Helm repository")

	if err := rootCmd.Execute(); err != nil {
		color.New(color.FgRed).Println(err)
		os.Exit(1)
	}
	return nil
}

func registerRootCommands(cmd *cobra.Command, args []string) error {
	cmd.AddCommand(registerCommand_App())
	cmd.AddCommand(registerCommand_Apply())
	cmd.AddCommand(registerCommand_Auth())
	cmd.AddCommand(registerCommand_Cluster())
	cmd.AddCommand(registerCommand_Config())
	cmd.AddCommand(registerCommand_Connect())
	cmd.AddCommand(registerCommand_Create())
	cmd.AddCommand(registerCommand_Delete())
	cmd.AddCommand(registerCommand_Deploy())
	cmd.AddCommand(registerCommand_Docker())
	cmd.AddCommand(registerCommand_Get())
	cmd.AddCommand(registerCommand_Helm())
	cmd.AddCommand(registerCommand_Job())
	cmd.AddCommand(registerCommand_Kubectl())
	cmd.AddCommand(registerCommand_List())
	cmd.AddCommand(registerCommand_Logs())
	cmd.AddCommand(registerCommand_Open())
	cmd.AddCommand(registerCommand_PortForward())
	cmd.AddCommand(registerCommand_Project())
	cmd.AddCommand(registerCommand_Registry())
	cmd.AddCommand(registerCommand_Run())
	cmd.AddCommand(registerCommand_Server())
	cmd.AddCommand(registerCommand_Stack())
	cmd.AddCommand(registerCommand_Update())
	cmd.AddCommand(registerCommand_Version())
	return nil
}
