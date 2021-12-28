package pack

import (
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	"github.com/buildpacks/pack/logging"
)

type packLogger struct {
	out *log.Logger
}

// Replicate the exact behavior of https://github.com/buildpacks/pack/blob/main/pkg/logging/logger_simple.go
func newPackLogger() logging.Logger {
	return &packLogger{
		out: log.New(os.Stderr, "", log.LstdFlags|log.Lmicroseconds),
	}
}

const (
	debugPrefix = "DEBUG:"
	infoPrefix  = "INFO:"
	warnPrefix  = "WARN:"
	errorPrefix = "ERROR:"
	prefixFmt   = "%-7s %s"
)

func (l *packLogger) Debug(msg string) {
	l.out.Printf(prefixFmt, debugPrefix, msg)
}

func (l *packLogger) Debugf(format string, v ...interface{}) {
	// We do not want to print the environment variables for now as they might
	// contain sensitive information like client IDs and secrets
	// Refer: https://github.com/buildpacks/pack/blob/main/internal/builder/builder.go#L349
	if !strings.HasPrefix(format, "Provided Environment Variables") {
		l.out.Printf(prefixFmt, debugPrefix, fmt.Sprintf(format, v...))
	}
}

func (l *packLogger) Info(msg string) {
	l.out.Printf(prefixFmt, infoPrefix, msg)
}

func (l *packLogger) Infof(format string, v ...interface{}) {
	l.out.Printf(prefixFmt, infoPrefix, fmt.Sprintf(format, v...))
}

func (l *packLogger) Warn(msg string) {
	l.out.Printf(prefixFmt, warnPrefix, msg)
}

func (l *packLogger) Warnf(format string, v ...interface{}) {
	l.out.Printf(prefixFmt, warnPrefix, fmt.Sprintf(format, v...))
}

func (l *packLogger) Error(msg string) {
	l.out.Printf(prefixFmt, errorPrefix, msg)
}

func (l *packLogger) Errorf(format string, v ...interface{}) {
	l.out.Printf(prefixFmt, errorPrefix, fmt.Sprintf(format, v...))
}

func (l *packLogger) Writer() io.Writer {
	return l.out.Writer()
}

func (l *packLogger) IsVerbose() bool {
	return false
}
