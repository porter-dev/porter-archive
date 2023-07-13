package authmanagement

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/joeshaw/envdecode"

	"github.com/bufbuild/connect-go"
	otelconnect "github.com/bufbuild/connect-opentelemetry-go"
	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

type Config struct {
	Port                 int    `env:"AUTH_MANAGEMENT_SERVER_PORT,default=8090"`
	TokenGeneratorSecret string `env:"TOKEN_GENERATOR_SECRET,default=secret"`
}

// AuthManagementServer contains all configuration options for the AuthManagementServer, implementing the
// gRPC server's interface
type AuthManagementServer struct {
	Config *Config
}

// NewAuthManagementServer loads the authmanagement.Config from the environment and returns an initialized AuthManagementServer
func NewAuthManagementServer() (AuthManagementServer, error) {
	var server AuthManagementServer

	var config Config
	if err := envdecode.StrictDecode(&config); err != nil {
		return server, fmt.Errorf("Failed to decode server conf: %s", err)
	}

	server.Config = &config

	return server, nil
}

// ListenAndServe starts the AuthManagementServer
func (a AuthManagementServer) ListenAndServe(ctx context.Context) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	mux := http.NewServeMux()

	mux.Handle(porterv1connect.NewAuthManagementServiceHandler(a,
		connect.WithInterceptors(
			otelconnect.NewInterceptor(otelconnect.WithTrustRemote()),
		),
	))

	srv := &http.Server{
		Addr:        fmt.Sprintf("0.0.0.0:%d", a.Config.Port),
		ReadTimeout: 5 * time.Second,

		// TODO: remove this. Use h2c so we can serve HTTP/2 without TLS.
		Handler: h2c.NewHandler(mux, &http2.Server{}),
	}
	defer srv.Shutdown(ctx) // nolint:errcheck

	errChan := make(chan error)

	go func() {
		err := srv.ListenAndServe()
		if err != nil {
			errChan <- err
		}
	}()

	select {
	case err := <-errChan:
		return err
	case <-ctx.Done():
	}

	return nil
}
