package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/server/api"
	"github.com/porter-dev/porter/server/requestlog"
	"github.com/porter-dev/porter/server/router/middleware"
)

// New creates a new Chi router instance
func New(a *api.App) *chi.Mux {
	l := a.Logger()
	r := chi.NewRouter()

	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.ContentTypeJSON)

		// /api/users routes
		r.Method("POST", "/users", requestlog.NewHandler(a.HandleCreateUser, l))
		r.Method("GET", "/users", requestlog.NewHandler(a.HandleReadUser, l))
	})

	return r
}
