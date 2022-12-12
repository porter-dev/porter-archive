package telemetry

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.12.0"
	"google.golang.org/grpc/credentials"
)

// TracerConfig contains all config for setting up an otel tracer
type TracerConfig struct {
	// ServiceName will show as service.name in spans
	ServiceName string
	// CollectorURL is the OLTP endpoint for receiving traces
	CollectorURL string
}

// Tracer is a wrapper for an otel tracer
type Tracer struct {
	config        TracerConfig
	TraceProvider *sdktrace.TracerProvider
}

// InitTracer creates a new otel trace provider, pointing at the provided collectorURL, with sensible defaults set
// Make sure to run `defer func() { tp.TraceProvider.Shutdown(ctx) }()` after calling this function
// to ensure that no traces are lost on exit
func InitTracer(ctx context.Context, conf TracerConfig) (Tracer, error) {
	tracer := Tracer{
		config: conf,
	}

	exporter, err := otlptrace.New(
		ctx,
		otlptracegrpc.NewClient(
			// TODO: do not commit without setting up TLS
			otlptracegrpc.WithTLSCredentials(credentials.NewClientTLSFromCert(nil, "")),
			otlptracegrpc.WithEndpoint(conf.CollectorURL),
		),
	)
	if err != nil {
		return tracer, err
	}

	resources, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String(conf.ServiceName),
		),
	)
	if err != nil {
		return tracer, err
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(resources),
	)
	tracer.TraceProvider = tp

	otel.SetTracerProvider(tp)

	return tracer, nil
}
