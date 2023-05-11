package telemetry

import (
	"context"
	"fmt"

	"github.com/honeycombio/otel-launcher-go/launcher"
)

// TracerConfig contains all config for setting up an otel tracer
type TracerConfig struct {
	// ServiceName will show as service.name in spans
	ServiceName string
	// CollectorURL is the OLTP endpoint for receiving traces
	CollectorURL string

	Debug bool
}

// Tracer is a wrapper for an otel tracer
type Tracer struct {
	config TracerConfig
	// TraceProvider *sdktrace.TracerProvider
	// Tracer        trace.Tracer
	Shutdown func()
}

// InitTracer is using the Honeycomb and Lightstep partnership launcher for setting up opentelemetry
// Make sure to run `defer tp.Shutdown(ctx)` after calling this function
// to ensure that no traces are lost on exit
func InitTracer(ctx context.Context, conf TracerConfig) (Tracer, error) {
	tracer := Tracer{
		config: conf,
	}

	bsp := NewBaggageSpanProcessor()

	lnchr, err := launcher.ConfigureOpenTelemetry(
		launcher.WithServiceName(conf.ServiceName),
		launcher.WithExporterEndpoint(conf.CollectorURL),
		launcher.WithSpanProcessor(bsp),
		launcher.WithLogLevel("DEBUG"),
		launcher.WithMetricsEnabled(false),  // can turn this on later
		launcher.WithExporterInsecure(true), // TODO: disable this before production usage
		// launcher.WithHeaders() // TODO: add in information about runtime environment
	)
	if err != nil {
		return tracer, err
	}

	tracer.Shutdown = lnchr
	return tracer, nil
}

func SetupTracer(conf TracerConfig) Tracer {
	tp := Tracer{}
	var err error
	if conf.CollectorURL != "" {
		tp, err = InitTracer(context.Background(), conf)
		if err != nil {
			fmt.Errorf("could not initialize tracer: %w", err)
			return Tracer{}
		}
	}
	return tp
}
