package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/registry"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

func NewRegistryScopedRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		GetRoutes: GetRegistryScopedRoutes,
		Children:  children,
	}
}

func GetRegistryScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
	routes, projPath := getRegistryRoutes(r, config, basePath, factory)

	if len(children) > 0 {
		r.Route(projPath.RelativePath, func(r chi.Router) {
			for _, child := range children {
				childRoutes := child.GetRoutes(r, config, basePath, factory, child.Children...)

				routes = append(routes, childRoutes...)
			}
		})
	}

	return routes
}

func getRegistryRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*Route, *types.Path) {
	relPath := "/registries/{registry_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*Route, 0)

	// GET /api/projects/{project_id}/registries/{registry_id} -> registry.NewRegistryGetHandler
	getEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.RegistryScope,
			},
		},
	)

	getHandler := registry.NewRegistryGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/registries/{registry_id}/repository -> registry.NewRegistryCreateRepositoryHandler
	createRepositoryEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/repository",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.RegistryScope,
			},
		},
	)

	createRepositoryHandler := registry.NewRegistryCreateRepositoryHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createRepositoryEndpoint,
		Handler:  createRepositoryHandler,
		Router:   r,
	})

	return routes, newPath
}
