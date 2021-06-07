package router

import (
	"net/http"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
)

func NewAPIRouter(config *shared.Config) *chi.Mux {
	r := chi.NewRouter()

	endpointFactory := shared.NewAPIObjectEndpointFactory(config)
	projRegisterer := NewProjectScopedRegisterer()
	userRegisterer := NewUserScopedRegisterer(projRegisterer)

	r.Route("/api", func(r chi.Router) {
		userRoutes := userRegisterer.GetRoutes(
			r,
			config,
			&types.Path{
				RelativePath: "",
			},
			endpointFactory,
			userRegisterer.Children...,
		)

		registerRoutes(userRoutes)
	})

	return r
}

type Route struct {
	Endpoint *shared.APIEndpoint
	Handler  http.Handler
	Router   chi.Router
}

type Registerer struct {
	GetRoutes func(
		r chi.Router,
		config *shared.Config,
		basePath *types.Path,
		factory shared.APIEndpointFactory,
		children ...*Registerer,
	) []*Route

	Children []*Registerer
}

func registerRoutes(routes []*Route) {
	for _, route := range routes {
		route.Router.Method(
			string(route.Endpoint.Metadata.Method),
			route.Endpoint.Metadata.Path.RelativePath,
			route.Handler,
		)
	}
}
