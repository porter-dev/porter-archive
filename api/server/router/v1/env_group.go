package v1

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/namespace"
	v1EnvGroup "github.com/porter-dev/porter/api/server/handlers/v1/env_group"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewV1EnvGroupScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetV1EnvGroupScopedRoutes,
		Children:  children,
	}
}

func GetV1EnvGroupScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getV1EnvGroupRoutes(r, config, basePath, factory)

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

func getV1EnvGroupRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/env_groups"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// PUT /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups -> namespace.NewCreateEnvGroupHandler
	createOrUpdateEnvGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPut,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	createOrUpdateEnvGroupHandler := namespace.NewCreateEnvGroupHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createOrUpdateEnvGroupEndpoint,
		Handler:  createOrUpdateEnvGroupHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name}/versions/{version} -> env_group.NewGetEnvGroupHandler
	getEnvGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/versions/{%s}", relPath, types.URLParamEnvGroupName,
					types.URLParamEnvGroupVersion),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	getEnvGroupHandler := v1EnvGroup.NewGetEnvGroupHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getEnvGroupEndpoint,
		Handler:  getEnvGroupHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name} -> env_group.NewGetEnvGroupAllVersionsHandler
	getEnvGroupAllVersionsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamEnvGroupName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	getEnvGroupAllVersionsHandler := v1EnvGroup.NewGetEnvGroupAllVersionsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getEnvGroupAllVersionsEndpoint,
		Handler:  getEnvGroupAllVersionsHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups -> namespace.NewListEnvGroupsHandler
	listEnvGroupsEndpoint := factory.NewAPIEndpoint(
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
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	listEnvGroupsHandler := namespace.NewListEnvGroupsHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listEnvGroupsEndpoint,
		Handler:  listEnvGroupsHandler,
		Router:   r,
	})

	// DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name} -> env_group.NewDeleteEnvGroupHandler
	deleteEnvGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamEnvGroupName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	deleteEnvGroupHandler := v1EnvGroup.NewDeleteEnvGroupHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteEnvGroupEndpoint,
		Handler:  deleteEnvGroupHandler,
		Router:   r,
	})

	// PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name}/add_release -> env_group.NewAddReleaseToEnvGroupHandler
	addReleaseToEnvGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPatch,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/add_release", relPath, types.URLParamEnvGroupName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	addReleaseToEnvGroupHandler := v1EnvGroup.NewAddReleaseToEnvGroupHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: addReleaseToEnvGroupEndpoint,
		Handler:  addReleaseToEnvGroupHandler,
		Router:   r,
	})

	// PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name}/remove_release -> env_group.NewRemoveReleaseFromEnvGroupHandler
	removeReleaseFromEnvGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPatch,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/remove_release", relPath, types.URLParamEnvGroupName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	removeReleaseFromEnvGroupHandler := v1EnvGroup.NewRemoveReleaseFromEnvGroupHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: removeReleaseFromEnvGroupEndpoint,
		Handler:  removeReleaseFromEnvGroupHandler,
		Router:   r,
	})

	return routes, newPath
}
