package router

import (
	"net/http"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
)

func NewAPIRouter(config *shared.Config) *chi.Mux {
	r := chi.NewRouter()
	endpointFactory := shared.NewAPIObjectEndpointFactory(config)
	authNFactory := authn.NewAuthNFactory(config)

	r.Route("/api", func(r chi.Router) {
		// create a group of authenticated endpoints
		r.Group(func(r chi.Router) {
			// all authenticated endpoints use the authn middleware
			r.Use(authNFactory.NewAuthenticated)

			// register all project-scoped routes
			RegisterProjectScopedRoutes(
				r,
				config,
				&types.Path{
					RelativePath: "/projects",
				},
				endpointFactory,
			)
		})
	})

	return r
}

type Route struct {
	Endpoint *shared.APIEndpoint
	Handler  http.Handler
}

func registerRoutes(r chi.Router, routes []*Route) {
	for _, route := range routes {
		r.Method(
			string(route.Endpoint.Metadata.Method),
			route.Endpoint.Metadata.Path.RelativePath,
			route.Handler,
		)
	}
}
