package requestlog

import (
	"io"
	"io/ioutil"
	"net/http"
	"time"

	lr "github.com/porter-dev/porter/internal/logger"
)

// Handler wraps an HTTP handler so that a log entry can be generated for
// request/response stats
type Handler struct {
	handler http.Handler
	logger  *lr.Logger
}

// NewHandler creates a new Handler instance based on an http.HandlerFunc
func NewHandler(h http.HandlerFunc, l *lr.Logger) *Handler {
	return &Handler{
		handler: h,
		logger:  l,
	}
}

// ServeHTTP calls its underlying handler's ServeHTTP method, then calls
// Log after the handler returns.
//
// ServeHTTP will always consume the request body up to the first error,
// even if the underlying handler does not.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	le := &logEntry{
		ReceivedTime:      start,
		RequestMethod:     r.Method,
		RequestURL:        r.URL.String(),
		RequestHeaderSize: headerSize(r.Header),
		UserAgent:         r.UserAgent(),
		Referer:           r.Referer(),
		Proto:             r.Proto,
	}

	r2 := new(http.Request)
	*r2 = *r
	rcc := &readCounterCloser{r: r.Body}
	r2.Body = rcc
	w2 := &responseStats{w: w}
	h.handler.ServeHTTP(w2, r2)
	le.Latency = time.Since(start)
	if rcc.err == nil && rcc.r != nil {
		// If the handler hasn't encountered an error in the Body (like EOF),
		// then consume the rest of the Body to provide an accurate rcc.n.
		io.Copy(ioutil.Discard, rcc)
	}
	le.RequestBodySize = rcc.n
	le.Status = w2.code
	if le.Status == 0 {
		le.Status = http.StatusOK
	}
	le.ResponseHeaderSize, le.ResponseBodySize = w2.size()
	h.logger.Info().
		Time("received_time", le.ReceivedTime).
		Str("method", le.RequestMethod).
		Str("url", le.RequestURL).
		Int64("header_size", le.RequestHeaderSize).
		Int64("body_size", le.RequestBodySize).
		Str("agent", le.UserAgent).
		Str("referer", le.Referer).
		Str("proto", le.Proto).
		Int("status", le.Status).
		Int64("resp_header_size", le.ResponseHeaderSize).
		Int64("resp_body_size", le.ResponseBodySize).
		Dur("latency", le.Latency).
		Msg("")
}
