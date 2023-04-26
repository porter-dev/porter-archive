package stack

import (
	"fmt"
)

type MessageLevel string

const (
	Warning MessageLevel = "WARN"
	Error   MessageLevel = "ERR"
	Success MessageLevel = "OK"
	Info    MessageLevel = "INFO"
)

func composePreviewMessage(msg string, level MessageLevel) string {
	return fmt.Sprintf("[porter.yaml stack][%s] -- %s", level, msg)
}
