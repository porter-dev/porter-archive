package middleware

import (
	"net/http"

	"github.com/porter-dev/porter/internal/telemetry"
	"go.opentelemetry.io/otel/trace"
)

// HydrateTraces pulls related IDs from requests, and puts them into a span which already exists.
// If no span already exists, these attibutes will not be populated. This should not be used as a replacement for creating your own spans.
// This should be added as the last middleware in the chain, so that it can pull IDs from the request context.
func HydrateTraces(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		span := trace.SpanFromContext(ctx)
		telemetry.AddKnownContextVariablesToSpan(ctx, span)
		r = r.Clone(ctx)
		next.ServeHTTP(w, r)
	})
}
