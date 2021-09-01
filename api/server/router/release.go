package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/release"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

func NewReleaseScopedRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		GetRoutes: GetReleaseScopedRoutes,
		Children:  children,
	}
}

func GetReleaseScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
	routes, projPath := getReleaseRoutes(r, config, basePath, factory)

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

func getReleaseRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*Route, *types.Path) {
	relPath := "/releases/{name}/{version}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*Route, 0)

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version} -> release.NewReleaseGetHandler
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

	routes = append(routes, &Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version}/controllers -> release.NewGetControllersHandler
	getControllersEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/controllers",
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

	getControllersHandler := release.NewGetControllersHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getControllersEndpoint,
		Handler:  getControllersHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version}/components -> release.NewGetComponentsHandler
	getComponentsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/components",
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

	getComponentsHandler := release.NewGetComponentsHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getComponentsEndpoint,
		Handler:  getComponentsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/history -> release.NewGetHistoryHandler
	getHistoryEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/releases/{name}/history",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	getHistoryHandler := release.NewGetReleaseHistoryHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getHistoryEndpoint,
		Handler:  getHistoryHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version}/pods/all -> release.NewGetAllPodsHandler
	getAllPodsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/pods/all",
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

	getAllPodsHandler := release.NewGetAllPodsHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getAllPodsEndpoint,
		Handler:  getAllPodsHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/notifications -> release.NewUpdateNotificationHandler
	updateNotifsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/releases/{name}/notifications",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	updateNotifsHandler := release.NewUpdateNotificationHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: updateNotifsEndpoint,
		Handler:  updateNotifsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/notifications -> release.NewGetNotificationHandler
	getNotifsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/releases/{name}/notifications",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	getNotifsHandler := release.NewGetNotificationHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getNotifsEndpoint,
		Handler:  getNotifsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/webhook -> release.NewGetWebhookHandler
	getWebhookEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/releases/{name}/webhook",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	getWebhookHandler := release.NewGetWebhookHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getWebhookEndpoint,
		Handler:  getWebhookHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/webhook -> release.NewCreateWebhookHandler
	createWebhookEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/releases/{name}/webhook",
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

	createWebhookHandler := release.NewCreateWebhookHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createWebhookEndpoint,
		Handler:  createWebhookHandler,
		Router:   r,
	})

	return routes, newPath
}
