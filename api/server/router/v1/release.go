package v1

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/namespace"
	"github.com/porter-dev/porter/api/server/handlers/release"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewV1ReleaseScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetV1ReleaseScopedRoutes,
		Children:  children,
	}
}

func GetV1ReleaseScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getV1ReleaseRoutes(r, config, basePath, factory)

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

func getV1ReleaseRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/releases"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// POST /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases -> release.NewCreateReleaseHandler
	createReleaseEndpoint := factory.NewAPIEndpoint(
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
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	createReleaseHandler := release.NewCreateReleaseHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createReleaseEndpoint,
		Handler:  createReleaseHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version} -> release.NewReleaseGetHandler
	getEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{name}/{version}",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.ReleaseScope,
			},
		},
	)

	getHandler := release.NewReleaseGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases -> namespace.NewListReleasesHandler
	listReleasesEndpoint := factory.NewAPIEndpoint(
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

	listReleasesHandler := namespace.NewListReleasesHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listReleasesEndpoint,
		Handler:  listReleasesHandler,
		Router:   r,
	})

	// PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version} ->
	// release.NewUpgradeReleaseHandler
	upgradeEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPatch,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{name}/{version}",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.ReleaseScope,
			},
		},
	)

	upgradeHandler := release.NewUpgradeReleaseHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: upgradeEndpoint,
		Handler:  upgradeHandler,
		Router:   r,
	})

	// DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version} ->
	// release.NewDeleteReleaseHandler
	deleteEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.ReleaseScope,
			},
		},
	)

	deleteHandler := release.NewDeleteReleaseHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteEndpoint,
		Handler:  deleteHandler,
		Router:   r,
	})

	return routes, newPath
}
