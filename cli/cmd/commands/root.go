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

	rootCmd, err := RegisterCommands()
	if err != nil {
		return fmt.Errorf("error setting up commands")
	}

	if err := rootCmd.Execute(); err != nil {
		color.New(color.FgRed).Println(err)
		os.Exit(1)
	}
	return nil
}
