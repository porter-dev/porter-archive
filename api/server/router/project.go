package server

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/auth"
	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
)

func NewProjectRouter(
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) *shared.Router {
	router := chi.NewRouter()

	// Create a new "project-scoped" factory which will create a new project-scoped request
	// after authorization. Each subsequent http.Handler can lookup the project in context.
	authFactory := auth.NewProjectScopedFactory(config.Repo.Project, config)

	// attach middleware to router
	router.Use(authFactory.NewProjectScoped)

	routes := registerProjectEndpoints(config, basePath, factory, router)

	return &shared.Router{
		Router: router,
		Routes: routes,
		Config: config,
	}
}

func registerProjectEndpoints(
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	router *chi.Mux,
) (routes []*shared.Route) {
	routes = make([]*shared.Route, 0)

	projectPath := &types.Path{
		Parent:       basePath,
		RelativePath: "/projects",
	}

	createEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       projectPath,
				RelativePath: "",
			},
		},
	)

	createHandler := project.NewProjectCreateHandler(config, createEndpoint)

	routes = append(routes, &shared.Route{
		Endpoint: createEndpoint,
		Handler:  createHandler,
	})

	return routes
}
