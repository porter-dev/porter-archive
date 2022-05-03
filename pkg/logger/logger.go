package logger

import (
	"context"
	"io"
	"net/http"
	"os"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/rs/zerolog"
)

// Logger is a wrapper for a zerolog Logger
type Logger struct {
	logger *zerolog.Logger
}

// New constructs a new Logger which logs via an os.File struct
func New(isDebug bool, file *os.File) *Logger {
	logLevel := zerolog.InfoLevel
	if isDebug {
		logLevel = zerolog.DebugLevel
	}

	zerolog.SetGlobalLevel(logLevel)
	logger := zerolog.New(file).With().Timestamp().Logger()

	return &Logger{logger: &logger}
}

// NewConsole uses os.Stdout construct a Logger
func NewConsole(isDebug bool) *Logger {
	return New(isDebug, os.Stdout)
}

// NewErrorConsole uses os.Stderr construct a Logger
func NewErrorConsole(isDebug bool) *Logger {
	return New(isDebug, os.Stderr)
}

// Output duplicates the global logger and sets w as its output.
func (l *Logger) Output(w io.Writer) zerolog.Logger {
	return l.logger.Output(w)
}

// With creates a child logger with the field added to its context.
func (l *Logger) With() zerolog.Context {
	return l.logger.With()
}

// Level creates a child logger with the minimum accepted level set to level.
func (l *Logger) Level(level zerolog.Level) zerolog.Logger {
	return l.logger.Level(level)
}

// Sample returns a logger with the s sampler.
func (l *Logger) Sample(s zerolog.Sampler) zerolog.Logger {
	return l.logger.Sample(s)
}

// Hook returns a logger with the h Hook.
func (l *Logger) Hook(h zerolog.Hook) zerolog.Logger {
	return l.logger.Hook(h)
}

// Debug starts a new message with debug level.
//
// You must call Msg on the returned event in order to send the event.
func (l *Logger) Debug() *zerolog.Event {
	return l.logger.Debug()
}

// Info starts a new message with info level.
//
// You must call Msg on the returned event in order to send the event.
func (l *Logger) Info() *zerolog.Event {
	return l.logger.Info()
}

// Warn starts a new message with warn level.
//
// You must call Msg on the returned event in order to send the event.
func (l *Logger) Warn() *zerolog.Event {
	return l.logger.Warn()
}

// Error starts a new message with error level.
//
// You must call Msg on the returned event in order to send the event.
func (l *Logger) Error() *zerolog.Event {
	return l.logger.Error()
}

// Fatal starts a new message with fatal level. The os.Exit(1) function
// is called by the Msg method.
//
// You must call Msg on the returned event in order to send the event.
func (l *Logger) Fatal() *zerolog.Event {
	return l.logger.Fatal()
}

// Panic starts a new message with panic level. The message is also sent
// to the panic function.
//
// You must call Msg on the returned event in order to send the event.
func (l *Logger) Panic() *zerolog.Event {
	return l.logger.Panic()
}

// WithLevel starts a new message with level.
//
// You must call Msg on the returned event in order to send the event.
func (l *Logger) WithLevel(level zerolog.Level) *zerolog.Event {
	return l.logger.WithLevel(level)
}

// Log starts a new message with no level. Setting zerolog.GlobalLevel to
// zerolog.Disabled will still disable events produced by this method.
//
// You must call Msg on the returned event in order to send the event.
func (l *Logger) Log() *zerolog.Event {
	return l.logger.Log()
}

// Print sends a log event using debug level and no extra field.
// Arguments are handled in the manner of fmt.Print.
func (l *Logger) Print(v ...interface{}) {
	l.logger.Print(v...)
}

// Printf sends a log event using debug level and no extra field.
// Arguments are handled in the manner of fmt.Printf.
func (l *Logger) Printf(format string, v ...interface{}) {
	l.logger.Printf(format, v...)
}

// Ctx returns the Logger associated with the ctx. If no logger
// is associated, a disabled logger is returned.
func (l *Logger) Ctx(ctx context.Context) *Logger {
	return &Logger{logger: zerolog.Ctx(ctx)}
}

func AddLoggingContextScopes(ctx context.Context, event *zerolog.Event) map[string]interface{} {
	res := make(map[string]interface{})

	// case on the context values that exist, add them to event
	if userVal := ctx.Value(types.UserScope); userVal != nil {
		if userModel, ok := userVal.(*models.User); ok {
			event.Uint("user_id", userModel.ID)
			res["user_id"] = userModel.ID
		}
	}

	// if this is a project-scoped route, add various scopes
	if reqScopesVal := ctx.Value(types.RequestScopeCtxKey); reqScopesVal != nil {
		if reqScopes, ok := reqScopesVal.(map[types.PermissionScope]*types.RequestAction); ok {
			for key, scope := range reqScopes {
				if scope.Resource.Name != "" {
					event.Str(string(key), scope.Resource.Name)
					res[string(key)] = scope.Resource.Name
				}

				if scope.Resource.UInt != 0 {
					event.Uint(string(key), scope.Resource.UInt)
					res[string(key)] = scope.Resource.UInt
				}
			}
		}
	}

	return res
}

func AddLoggingRequestMeta(r *http.Request, event *zerolog.Event) {
	event.Str("method", r.Method)
	event.Str("url", r.URL.String())
}
