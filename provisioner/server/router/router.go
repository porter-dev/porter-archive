package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/router/middleware"
	"github.com/porter-dev/porter/provisioner/server/authz"
	"github.com/porter-dev/porter/provisioner/server/config"
	"github.com/porter-dev/porter/provisioner/server/handlers/state"
)

func NewAPIRouter(config *config.Config) *chi.Mux {
	r := chi.NewRouter()

	r.Route("/api/v1", func(r chi.Router) {
		// set the content type for all API endpoints and log all request info
		r.Use(middleware.ContentTypeJSON)

		// create new group for raw state endpoints which use infra authz middleware
		infraAuth := authz.NewInfraScopedFactory(config)
		r.Group(func(r chi.Router) {
			r.Use(infraAuth.Middleware)

			r.Method("GET", "/{workspace_id}/tfstate", state.NewRawStateGetHandler(config))
			r.Method("POST", "/{workspace_id}/tfstate", state.NewRawStateUpdateHandler(config))
		})
	})

	return r
}
