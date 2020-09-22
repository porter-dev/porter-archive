package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/server/api"
	"github.com/porter-dev/porter/server/requestlog"
)

// New creates a new Chi router instance
func New(a *api.App) *chi.Mux {
	l := a.Logger()
	r := chi.NewRouter()

	r.Method("GET", "/user", requestlog.NewHandler(a.HandleReadUser, l))
	return r
}
