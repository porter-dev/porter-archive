package server

import (
	"context"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/porter-dev/porter/api/server/shared/config/env"
)

// PorterAPIServer contains the routing and configuration options for starting the PorterAPIServer
type PorterAPIServer struct {
	// Port is the port that PorterAPIServer listens on
	Port int
	// Router is the router that handles requests
	Router *chi.Mux
	// ServerConf is the server configuration
	ServerConf *env.ServerConf
}

// ListenAndServe starts the Porter API server
func (p PorterAPIServer) ListenAndServe(ctx context.Context) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	address := fmt.Sprintf(":%d", p.Port)

	srv := &http.Server{
		Addr:         address,
		Handler:      p.Router,
		ReadTimeout:  p.ServerConf.TimeoutRead,
		WriteTimeout: p.ServerConf.TimeoutWrite,
		IdleTimeout:  p.ServerConf.TimeoutIdle,
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
