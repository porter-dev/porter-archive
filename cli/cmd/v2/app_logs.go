package v2

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
)

// AppLogsInput is the input for the AppLogs function
type AppLogsInput struct {
	// CLIConfig is the CLI configuration
	CLIConfig config.CLIConfig
	// Client is the Porter API client
	Client api.Client
	// DeploymentTargetName is the name of deployment target where the app is deployed
	DeploymentTargetName string
	// AppName is the name of the app to get logs for
	AppName string
	// ServiceName is an optional service name filter
	ServiceName string
}

// ServiceName_AllServices is a special value for ServiceName that indicates all services should be included
const ServiceName_AllServices = "all"

// AppLogs gets logs for an app
func AppLogs(ctx context.Context, inp AppLogsInput) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	termChan := make(chan os.Signal, 1)
	signal.Notify(termChan, syscall.SIGINT, syscall.SIGTERM)

	color.New(color.FgGreen).Printf("Streaming logs for app %s...\n\n", inp.AppName) // nolint:errcheck,gosec

	conn, err := inp.Client.AppLogsStream(ctx, api.AppLogsInput{
		ProjectID:            inp.CLIConfig.Project,
		ClusterID:            inp.CLIConfig.Cluster,
		AppName:              inp.AppName,
		DeploymentTargetName: inp.DeploymentTargetName,
		ServiceName:          inp.ServiceName,
	})
	if err != nil {
		return fmt.Errorf("error connecting to app logs stream: %w", err)
	}
	defer conn.Close() // nolint:errcheck

	go func() {
		select {
		case <-termChan:
			color.New(color.FgYellow).Println("Shutdown signal received, canceling processes") // nolint:errcheck,gosec

			// ReadMessage will block until the next message is received, so we need to set a read deadline
			conn.SetReadDeadline(time.Now()) // nolint:errcheck,gosec

			cancel()
		case <-ctx.Done():
		}
	}()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			_, message, _ := conn.ReadMessage()
			if err != nil {
				return err
			}
			if len(message) == 0 {
				return nil
			}

			var line struct {
				Line string `json:"line"`
			}

			err = json.Unmarshal(message, &line)
			if err != nil {
				return err
			}

			message = append([]byte(line.Line), '\n')
			if _, err = os.Stdout.Write(message); err != nil {
				return nil
			}
		}
	}
}
