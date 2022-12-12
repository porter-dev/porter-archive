package telemetry

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// AttributeKey helps enforce consistent naming conventions for attribute key
type AttributeKey string

const (
	// AttributeKeyUser refers to a Porter user
	AttributeKeyUser AttributeKey = "user"
	// AttributeKeyProject refers to a Porter project
	AttributeKeyProject AttributeKey = "project"
	// AttributeKeyCluster refers to a Porter cluster
	AttributeKeyCluster AttributeKey = "cluster"
)

// NewSpan is a convenience function for creating a new span, with a Porter-namespaced name to avoid conflicts.
// Any commonly used variables in the context, will be added to the span such as clusterID, projectID.
// When using this function, make sure to call `defer span.End()` immediately after, to avoid lost spans.
func NewSpan(ctx context.Context, name string) (context.Context, trace.Span) {
	ctx, span := otel.Tracer("").Start(ctx, prefixSpanKey(name))

	if user, ok := UserFromContext(ctx); ok {
		WithAttributes(span, AttributeKV{Key: AttributeKeyUser, Value: user.ID})
	}

	WithAttributes(
		span,
		// TODO: find out where these context keys are actually stored. I believe that these are scopes, not context keys
		AttributeKV{Key: AttributeKeyCluster, Value: stringFromContext(ctx, types.ClusterScope)},
		AttributeKV{Key: AttributeKeyProject, Value: stringFromContext(ctx, types.ProjectScope)},
	)

	return ctx, span
}

// AttributeKV is a wrapper for otel attributes KV
type AttributeKV struct {
	Key   AttributeKey
	Value any
}

// WithAttributes is a convenience function for adding attributes to a given span
// This will also add the namespaced prefix to the keys
func WithAttributes(span trace.Span, attrs ...AttributeKV) {
	for _, attr := range attrs {
		if attr.Key != "" {
			switch attr.Value.(type) {
			case string:
				span.SetAttributes(attribute.String(prefixSpanKey(string(attr.Key)), attr.Value.(string)))
			case int64:
				span.SetAttributes(attribute.Int64(prefixSpanKey(string(attr.Key)), attr.Value.(int64)))
			case float64:
				span.SetAttributes(attribute.Float64(prefixSpanKey(string(attr.Key)), attr.Value.(float64)))
			case bool:
				span.SetAttributes(attribute.Bool(prefixSpanKey(string(attr.Key)), attr.Value.(bool)))
			case uint:
				span.SetAttributes(attribute.Int(prefixSpanKey(string(attr.Key)), int(attr.Value.(uint))))
			}
		}
	}
}

// Error adds the given error message and related context to a span
// If message is empty, the span status_message will be set to the error
// It is advised to let the raw error be set at err, and message to be a human
// readable string
func Error(_ context.Context, span trace.Span, err error, message string) error {
	span.RecordError(err)

	m := message
	if m == "" {
		m = err.Error()
	}
	span.SetStatus(codes.Error, m)

	return err
}

func prefixSpanKey(name string) string {
	return fmt.Sprintf("porter.run/%s", name)
}

func stringFromContext(ctx context.Context, key any) string {
	if v, ok := ctx.Value(key).(string); ok {
		return v
	}
	return ""
}
