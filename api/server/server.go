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
	Port       int
	Handler    *chi.Mux
	ServerConf *env.ServerConf
}

// ListenAndServe starts the Porter API server
func (p PorterAPIServer) ListenAndServe(ctx context.Context) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	address := fmt.Sprintf(":%d", p.Port)

	srv := &http.Server{
		Addr:         address,
		Handler:      p.Handler,
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
