package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
)

func NewProjectScopedRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		GetRoutes: GetProjectScopedRoutes,
		Children:  children,
	}
}

func GetProjectScopedRoutes(
	r chi.Router,
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
	routes, projPath := getProjectRoutes(r, config, basePath, factory)

	if len(children) > 0 {
		r.Route(projPath.RelativePath, func(r chi.Router) {
			for _, child := range children {
				childRoutes := child.GetRoutes(r, config, basePath, factory, child.Children...)

				routes = append(routes, childRoutes...)
			}
		})
	}

	// // Note that we can place the middleware r.Use below

	// // all project-scoped routes

	// // Create a new "project-scoped" factory which will create a new project-scoped request
	// // after authorization. Each subsequent http.Handler can lookup the project in context.
	// projFactory := authz.NewProjectScopedFactory(config)

	// // attach middleware to router
	// r.Use(projFactory.Middleware)

	return routes
}

func getProjectRoutes(
	r chi.Router,
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*Route, *types.Path) {
	relPath := "/projects/{project_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*Route, 0)

	// POST /api/projects -> project.NewProjectCreateHandler
	getEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	createHandler := project.NewProjectGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getEndpoint,
		Handler:  createHandler,
		Router:   r,
	})

	return routes, newPath
}
