package v2beta1

import (
	"fmt"

	"github.com/fatih/color"
)

type MessageLevel string

const (
	Warning MessageLevel = "WARN"
	Error   MessageLevel = "ERR"
	Success MessageLevel = "OK"
	Info    MessageLevel = "INFO"
)

func ComposePreviewMessage(msg string, level MessageLevel) string {
	return fmt.Sprintf("[porter.yaml v2beta1][%s] -- %s", level, msg)
}

func PrintWarningMessage(msg string) {
	color.New(color.FgYellow).Printf(fmt.Sprintf("%s\n", ComposePreviewMessage(msg, Warning)))
}

func PrintErrorMessage(msg string) {
	color.New(color.FgRed).Printf(fmt.Sprintf("%s\n", ComposePreviewMessage(msg, Error)))
}

func PrintSuccessMessage(msg string) {
	color.New(color.FgGreen).Printf(fmt.Sprintf("%s\n", ComposePreviewMessage(msg, Success)))
}

func PrintInfoMessage(msg string) {
	color.New(color.FgBlue).Printf(fmt.Sprintf("%s\n", ComposePreviewMessage(msg, Info)))
}
