//go:build cli
// +build cli

package main

import (
	"fmt"
	"os"
	"time"

	"github.com/fatih/color"
	"github.com/getsentry/sentry-go"
	"github.com/porter-dev/porter/cli/cmd"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/errors"
)

func main() {
	if errors.SentryDSN != "" {
		fmt.Println("initialising sentry")

		err := sentry.Init(sentry.ClientOptions{
			Dsn:         errors.SentryDSN,
			Environment: "cli",
			Debug:       config.Version == "dev",
			Release:     config.Version,
		})

		if err != nil {
			color.New(color.FgRed).Fprintf(os.Stderr, "error initialising sentry: %s\n", err)
			os.Exit(1)
		}

		defer sentry.Flush(2 * time.Second)
	}

	cmd.Execute()
}
