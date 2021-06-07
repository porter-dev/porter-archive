package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
)

func NewUserScopedRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		Func:     RegisterUserScopedRoutes,
		Children: children,
	}
}

func RegisterUserScopedRoutes(
	r chi.Router,
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) chi.Router {
	// Create a new "user-scoped" factory which will create a new user-scoped request
	// after authentication. Each subsequent http.Handler can lookup the user in context.
	authNFactory := authn.NewAuthNFactory(config)

	// attach middleware to router
	r.Use(authNFactory.NewAuthenticated)

	registerUserRoutes(r, config, basePath, factory)

	for _, child := range children {
		r.Group(func(r chi.Router) {
			child.Func(r, config, basePath, factory, child.Children...)
		})
	}

	return r
}

func registerUserRoutes(
	r chi.Router,
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) {
	routes := make([]*Route, 0)

	// POST /api/projects -> project.NewProjectCreateHandler
	createEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/projects",
			},
		},
	)

	createHandler := project.NewProjectCreateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createEndpoint,
		Handler:  createHandler,
	})

	// GET /api/projects -> project.NewProjectListHandler
	listEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/projects",
			},
		},
	)

	listHandler := project.NewProjectListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listEndpoint,
		Handler:  listHandler,
	})

	registerRoutes(r, routes)
}
