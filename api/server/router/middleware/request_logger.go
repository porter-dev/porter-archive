package middleware

import (
	"bufio"
	"errors"
	"net"
	"net/http"
	"time"

	"github.com/porter-dev/porter/internal/logger"
)

type requestLoggerResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newRequestLoggerResponseWriter(w http.ResponseWriter) *requestLoggerResponseWriter {
	return &requestLoggerResponseWriter{w, http.StatusOK}
}

func (rw *requestLoggerResponseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *requestLoggerResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := rw.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, errors.New("ResponseWriter Interface does not support hijacking")
	}
	return h.Hijack()
}

type RequestLoggerMiddleware struct {
	logger *logger.Logger
}

func NewRequestLoggerMiddleware(logger *logger.Logger) *RequestLoggerMiddleware {
	return &RequestLoggerMiddleware{logger}
}

func (mw *RequestLoggerMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := newRequestLoggerResponseWriter(w)

		next.ServeHTTP(rw, r)

		latency := time.Since(start)

		event := mw.logger.Info().Dur("latency", latency).Int("status", rw.statusCode)

		logger.AddLoggingContextScopes(r.Context(), event)
		logger.AddLoggingRequestMeta(r, event)

		event.Send()
	})
}
