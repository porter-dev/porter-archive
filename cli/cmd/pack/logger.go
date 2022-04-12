package pack

import (
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"
	"strings"

	"github.com/buildpacks/pack/pkg/logging"
)

type packLogger struct {
	outDiscard *log.Logger
	outStderr  *log.Logger
	safeWriter *safeWriter
}

// Replicate the exact behavior of https://github.com/buildpacks/pack/blob/main/pkg/logging/logger_simple.go
func newPackLogger() logging.Logger {
	discard := log.New(ioutil.Discard, "", log.LstdFlags|log.Lmicroseconds)
	stderr := log.New(os.Stderr, "", log.LstdFlags|log.Lmicroseconds)

	return &packLogger{
		outDiscard: discard,
		outStderr:  stderr,
		safeWriter: &safeWriter{discard, stderr},
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
	l.outStderr.Printf(prefixFmt, debugPrefix, msg)
}

func (l *packLogger) Debugf(format string, v ...interface{}) {
	// We do not want to print the environment variables for now as they might
	// contain sensitive information like client IDs and secrets
	// Refer: https://github.com/buildpacks/pack/blob/main/internal/builder/builder.go#L349
	if strings.HasPrefix(format, "Provided Environment Variables") {
		return
	}

	// We do not print the registry auth credentials -- this should also be treated as sensitive information
	if strings.Contains(fmt.Sprintf(format, v...), "CNB_REGISTRY_AUTH") {
		return
	}

	l.outStderr.Printf(prefixFmt, debugPrefix, fmt.Sprintf(format, v...))
}

func (l *packLogger) Info(msg string) {
	l.outStderr.Printf(prefixFmt, infoPrefix, msg)
}

func (l *packLogger) Infof(format string, v ...interface{}) {
	l.outStderr.Printf(prefixFmt, infoPrefix, fmt.Sprintf(format, v...))
}

func (l *packLogger) Warn(msg string) {
	l.outStderr.Printf(prefixFmt, warnPrefix, msg)
}

func (l *packLogger) Warnf(format string, v ...interface{}) {
	l.outStderr.Printf(prefixFmt, warnPrefix, fmt.Sprintf(format, v...))
}

func (l *packLogger) Error(msg string) {
	l.outStderr.Printf(prefixFmt, errorPrefix, msg)
}

func (l *packLogger) Errorf(format string, v ...interface{}) {
	l.outStderr.Printf(prefixFmt, errorPrefix, fmt.Sprintf(format, v...))
}

type safeWriter struct {
	outDiscard *log.Logger
	outStderr  *log.Logger
}

func (s *safeWriter) Write(p []byte) (n int, err error) {
	if strings.Contains(string(p), "Unable to delete previous cache image") {
		return s.outDiscard.Writer().Write(p)
	}

	return s.outStderr.Writer().Write(p)
}

func (l *packLogger) Writer() io.Writer {
	return l.safeWriter
}

func (l *packLogger) IsVerbose() bool {
	return false
}
