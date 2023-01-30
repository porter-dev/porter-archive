package errors

import (
	"fmt"
	"os"

	"github.com/fatih/color"
	"github.com/getsentry/sentry-go"
	"github.com/porter-dev/porter/cli/cmd/config"
)

var SentryDSN string = ""

type errorHandler interface {
	HandleError(error)
}

type standardErrorHandler struct{}

func (h *standardErrorHandler) HandleError(err error) {
	color.New(color.FgRed).Fprintf(os.Stderr, "error: %s\n", err.Error())
}

type sentryErrorHandler struct{}

func (h *sentryErrorHandler) HandleError(err error) {
	if SentryDSN != "" {
		localHub := sentry.CurrentHub().Clone()

		localHub.ConfigureScope(func(scope *sentry.Scope) {
			scope.SetTags(map[string]string{
				"host":    config.GetCLIConfig().Host,
				"project": fmt.Sprintf("%d", config.GetCLIConfig().Project),
				"cluster": fmt.Sprintf("%d", config.GetCLIConfig().Cluster),
			})
		})

		if eventID := localHub.CaptureException(err); eventID == nil {
			color.New(color.FgRed).Fprintf(os.Stderr, "error in sending exception to sentry\n")
		}
	}

	color.New(color.FgRed).Fprintf(os.Stderr, "error: %s\n", err.Error())
}

func GetErrorHandler() errorHandler {
	if SentryDSN != "" {
		return &sentryErrorHandler{}
	}

	return &standardErrorHandler{}
}
