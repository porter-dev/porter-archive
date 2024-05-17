package telemetry

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"runtime"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// AttributeKey helps enforce consistent naming conventions for attribute key
type AttributeKey string

// NewSpan is a convenience function for creating a new span, with a Porter-namespaced name to avoid conflicts.
// Any commonly used variables in the context, will be added to the span such as clusterID, projectID.
// When using this function, make sure to call `defer span.End()` immediately after, to avoid lost spans.
func NewSpan(ctx context.Context, name string) (context.Context, trace.Span) {
	ctx, span := otel.Tracer("").Start(ctx, prefixSpanKey(name))
	AddKnownContextVariablesToSpan(ctx, span)
	return ctx, span
}

// AddKnownContextVariablesToSpan adds known commonly read context variables to a span
func AddKnownContextVariablesToSpan(ctx context.Context, span trace.Span) {
	user, ok := ctx.Value(types.UserScope).(*models.User)
	if ok {
		WithAttributes(span, AttributeKV{Key: "user-id", Value: user.ID})
	}

	cluster, ok := ctx.Value(types.ClusterScope).(*models.Cluster)
	if ok {
		WithAttributes(span, AttributeKV{Key: "cluster-id", Value: cluster.ID})
	}

	if project, ok := ctx.Value(types.ProjectScope).(*models.Project); ok {
		WithAttributes(span, AttributeKV{Key: "project-id", Value: project.ID})
	}

	if deploymentTarget, ok := ctx.Value(types.DeploymentTargetScope).(types.DeploymentTarget); ok {
		WithAttributes(span, AttributeKV{Key: "deployment-target-id", Value: deploymentTarget.ID})
	}
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
			switch val := attr.Value.(type) {
			case uuid.UUID:
				span.SetAttributes(attribute.String(prefixSpanKey(string(attr.Key)), val.String()))
			case string:
				span.SetAttributes(attribute.String(prefixSpanKey(string(attr.Key)), val))
			case []string:
				span.SetAttributes(attribute.String(prefixSpanKey(string(attr.Key)), strings.Join(val, ", ")))
			case sql.NullString:
				if val.Valid {
					span.SetAttributes(attribute.String(prefixSpanKey(string(attr.Key)), val.String))
				} else {
					span.SetAttributes(attribute.String(prefixSpanKey(string(attr.Key)), "NULL"))
				}
			case int:
				span.SetAttributes(attribute.Int(prefixSpanKey(string(attr.Key)), val))
			case int64:
				span.SetAttributes(attribute.Int64(prefixSpanKey(string(attr.Key)), val))
			case int32:
				span.SetAttributes(attribute.Int64(prefixSpanKey(string(attr.Key)), int64(val)))
			case uint:
				span.SetAttributes(attribute.Int(prefixSpanKey(string(attr.Key)), int(val)))
			case float64:
				span.SetAttributes(attribute.Float64(prefixSpanKey(string(attr.Key)), val))
			case bool:
				span.SetAttributes(attribute.Bool(prefixSpanKey(string(attr.Key)), val))
			case time.Time:
				span.SetAttributes(attribute.String(prefixSpanKey(string(attr.Key)), val.String()))
				zone, offset := val.Zone()
				span.SetAttributes(attribute.String(prefixSpanKey(fmt.Sprintf("%s-timezone", string(attr.Key))), zone))
				span.SetAttributes(attribute.Int(prefixSpanKey(fmt.Sprintf("%s-offset", string(attr.Key))), offset))
			default:
				span.SetAttributes(attribute.String(prefixSpanKey(string(attr.Key)), fmt.Sprintf("%v", val)))
			}
		}
	}
}

// Error adds the given error message and related context to a span
// If message is empty, the span status_message will be set to the error
// It is advised to let the raw error be set at err, and message to be a human
// readable string
func Error(_ context.Context, span trace.Span, err error, message string) error {
	if message != "" {
		WithAttributes(span, AttributeKV{Key: "message", Value: message})
	}
	if err == nil {
		err = errors.New(message)
	}
	WithAttributes(span, AttributeKV{Key: "error-message", Value: err.Error()}) // exact same as `status_message` but gives a more consolidated view when searching by porter.run/

	_, fn, line, _ := runtime.Caller(1)
	stackTraceLocation := fmt.Sprintf("%s:%d", fn, line)
	WithAttributes(span, AttributeKV{Key: "stack-trace-location", Value: stackTraceLocation})

	span.SetStatus(codes.Error, err.Error())
	span.RecordError(err)

	return err
}

func prefixSpanKey(name string) string {
	return fmt.Sprintf("porter.run/%s", name)
}
