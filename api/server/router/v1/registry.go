package v1

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/registry"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewV1RegistryScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetV1RegistryScopedRoutes,
		Children:  children,
	}
}

func GetV1RegistryScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getV1RegistryRoutes(r, config, basePath, factory)

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

func getV1RegistryRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/registries"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// POST /api/v1/projects/{project_id}/registries -> registry.NewRegistryCreateHandler
	createRegistryEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
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

	createRegistryHandler := registry.NewRegistryCreateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createRegistryEndpoint,
		Handler:  createRegistryHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/registries/{registry_id} -> registry.NewRegistryGetHandler
	getEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{registry_id}",
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

	routes = append(routes, &router.Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/registries -> registry.NewRegistryListHandler
	listRegistriesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
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

	listRegistriesHandler := registry.NewRegistryListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listRegistriesEndpoint,
		Handler:  listRegistriesHandler,
		Router:   r,
	})

	// DELETE /api/v1/projects/{project_id}/registries/{registry_id} -> registry.NewRegistryDeleteHandler
	deleteEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{registry_id}",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.RegistryScope,
			},
		},
	)

	deleteHandler := registry.NewRegistryDeleteHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteEndpoint,
		Handler:  deleteHandler,
		Router:   r,
	})

	// POST /api/v1/projects/{project_id}/registries/{registry_id}/repositories -> registry.NewRegistryCreateRepositoryHandler
	createRepositoryEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{registry_id}/repositories",
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

	routes = append(routes, &router.Route{
		Endpoint: createRepositoryEndpoint,
		Handler:  createRepositoryHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/registries/{registry_id}/repositories -> registry.NewRegistryListRepositoriesHandler
	listRepositoriesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{registry_id}/repositories",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.RegistryScope,
			},
		},
	)

	listRepositoriesHandler := registry.NewRegistryListRepositoriesHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listRepositoriesEndpoint,
		Handler:  listRepositoriesHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/registries/{registry_id}/repositories/* -> registry.NewRegistryListImagesHandler
	listImagesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"%s/{registry_id}/repositories/%s",
					relPath,
					types.URLParamWildcard,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.RegistryScope,
			},
		},
	)

	listImagesHandler := registry.NewRegistryListImagesHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listImagesEndpoint,
		Handler:  listImagesHandler,
		Router:   r,
	})

	return routes, newPath
}
