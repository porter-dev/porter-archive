package router

import (
	"net/http"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
)

func NewAPIRouter(config *shared.Config) *chi.Mux {
	r := chi.NewRouter()

	endpointFactory := shared.NewAPIObjectEndpointFactory(config)
	baseRegisterer := NewBaseRegisterer()
	projRegisterer := NewProjectScopedRegisterer()
	userRegisterer := NewUserScopedRegisterer(projRegisterer)

	r.Route("/api", func(r chi.Router) {
		baseRoutes := baseRegisterer.GetRoutes(
			r,
			config,
			&types.Path{
				RelativePath: "",
			},
			endpointFactory,
		)

		userRoutes := userRegisterer.GetRoutes(
			r,
			config,
			&types.Path{
				RelativePath: "",
			},
			endpointFactory,
			userRegisterer.Children...,
		)

		routes := append(baseRoutes, userRoutes...)

		registerRoutes(config, routes)
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

func registerRoutes(config *shared.Config, routes []*Route) {
	// Create a new "user-scoped" factory which will create a new user-scoped request
	// after authentication. Each subsequent http.Handler can lookup the user in context.
	authNFactory := authn.NewAuthNFactory(config)

	// Create a new "project-scoped" factory which will create a new project-scoped request
	// after authorization. Each subsequent http.Handler can lookup the project in context.
	projFactory := authz.NewProjectScopedFactory(config)

	for _, route := range routes {
		atomicGroup := route.Router.Group(nil)

		for _, scope := range route.Endpoint.Metadata.Scopes {
			switch scope {
			case types.UserScope:
				atomicGroup.Use(authNFactory.NewAuthenticated)
			case types.ProjectScope:
				atomicGroup.Use(projFactory.Middleware)
			}
		}

		atomicGroup.Method(
			string(route.Endpoint.Metadata.Method),
			route.Endpoint.Metadata.Path.RelativePath,
			route.Handler,
		)
	}
}
