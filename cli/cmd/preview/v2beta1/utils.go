package v2beta1

import (
	"crypto/rand"
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

func composePreviewMessage(msg string, level MessageLevel) string {
	return fmt.Sprintf("[porter.yaml v2beta1][%s] -- %s", level, msg)
}

func printWarningMessage(msg string) {
	color.New(color.FgYellow).Printf(fmt.Sprintf("%s\n", composePreviewMessage(msg, Warning)))
}

func printErrorMessage(msg string) {
	color.New(color.FgRed).Printf(fmt.Sprintf("%s\n", composePreviewMessage(msg, Error)))
}

func printSuccessMessage(msg string) {
	color.New(color.FgGreen).Printf(fmt.Sprintf("%s\n", composePreviewMessage(msg, Success)))
}

func printInfoMessage(msg string) {
	color.New(color.FgBlue).Printf(fmt.Sprintf("%s\n", composePreviewMessage(msg, Info)))
}

func booleanptr(b bool) *bool {
	copy := b
	return &copy
}

func stringptr(s string) *string {
	copy := s
	return &copy
}

func randomString(length uint, charset string) string {
	ll := len(charset)
	b := make([]byte, length)
	rand.Read(b) // generates len(b) random bytes
	for i := uint(0); i < length; i++ {
		b[i] = charset[int(b[i])%ll]
	}
	return string(b)
}
