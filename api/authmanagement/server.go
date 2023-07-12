package authmanagement

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bufbuild/connect-go"
	otelconnect "github.com/bufbuild/connect-opentelemetry-go"
	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"
	"github.com/porter-dev/porter/api/server/shared/config"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

// AuthManagementServer contains all configuration options for the AuthManagementServer, implementing the
// gRPC server's interface
type AuthManagementServer struct {
	Port   int
	Config *config.Config
}

// ListenAndServe starts the gRPC server
func (a AuthManagementServer) ListenAndServe(ctx context.Context) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	mux := http.NewServeMux()

	mux.Handle(porterv1connect.NewAuthManagementHandler(a,
		connect.WithInterceptors(
			otelconnect.NewInterceptor(otelconnect.WithTrustRemote()),
		),
	))

	srv := &http.Server{
		Addr:        fmt.Sprintf("0.0.0.0:%d", a.Port),
		ReadTimeout: 5 * time.Second,

		// TODO: remove this. Use h2c so we can serve HTTP/2 without TLS.
		Handler: h2c.NewHandler(mux, &http2.Server{}),
	}
	defer srv.Shutdown(ctx) // nolint:errcheck
	log.Printf("listening on %s\n", srv.Addr)

	go func(srv *http.Server) {
		err := srv.ListenAndServe()
		if err != nil {
			log.Fatalf("issue running gRPC server: %s", err.Error())
		}
	}(srv)

	termChan := make(chan os.Signal, 1)
	signal.Notify(termChan, syscall.SIGINT, syscall.SIGTERM)

	select {
	case <-termChan:
		log.Println("interrupt received, shutting down gRPC server")
	case <-ctx.Done():
		log.Println("context cancelled, shutting down gRPC server")
	}

	return nil
}
