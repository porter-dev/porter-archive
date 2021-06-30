package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
)

func NewUserScopedRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		GetRoutes: GetUserScopedRoutes,
		Children:  children,
	}
}

func GetUserScopedRoutes(
	r chi.Router,
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
	routes := getUserRoutes(r, config, basePath, factory)

	for _, child := range children {
		r.Group(func(r chi.Router) {
			childRoutes := child.GetRoutes(r, config, basePath, factory, child.Children...)

			routes = append(routes, childRoutes...)
		})
	}

	return routes
}

func getUserRoutes(
	r chi.Router,
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) []*Route {
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
			Scopes: []types.PermissionScope{types.UserScope},
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
		Router:   r,
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
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	listHandler := project.NewProjectListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listEndpoint,
		Handler:  listHandler,
		Router:   r,
	})

	return routes
}
