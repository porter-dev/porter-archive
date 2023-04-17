package stack

import "fmt"

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

func GetEnv(raw map[*string]*string) map[string]string {
	env := make(map[string]string)

	for k, v := range raw {
		if k == nil || v == nil {
			continue
		}

		env[*k] = *v
	}

	return env
}
