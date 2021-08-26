package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/cluster"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
)

func NewClusterScopedRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		GetRoutes: GetClusterScopedRoutes,
		Children:  children,
	}
}

func GetClusterScopedRoutes(
	r chi.Router,
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
	routes, projPath := getClusterRoutes(r, config, basePath, factory)

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

func getClusterRoutes(
	r chi.Router,
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*Route, *types.Path) {
	relPath := "/clusters/{cluster_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*Route, 0)

	// GET /api/projects/{project_id}/clusters/{cluster_id} -> project.NewClusterGetHandler
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
			},
		},
	)

	getHandler := cluster.NewClusterGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces -> cluster.NewClusterListNamespacesHandler
	listNamespacesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/namespaces",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listNamespacesHandler := cluster.NewListNamespacesHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listNamespacesEndpoint,
		Handler:  listNamespacesHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/create -> cluster.NewCreateNamespaceHandler
	createNamespaceEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/namespaces/create",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createNamespaceHandler := cluster.NewCreateNamespaceHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createNamespaceEndpoint,
		Handler:  createNamespaceHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/clusters/{cluster_id}/namespaces/delete -> cluster.NewDeleteNamespaceHandler
	deleteNamespaceEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/namespaces/delete",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	deleteNamespaceHandler := cluster.NewDeleteNamespaceHandler(
		config,
		factory.GetDecoderValidator(),
	)

	routes = append(routes, &Route{
		Endpoint: deleteNamespaceEndpoint,
		Handler:  deleteNamespaceHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/kubeconfig -> cluster.NewGetTemporaryKubeconfigHandler
	getTemporaryKubeconfigEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/kubeconfig",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getTemporaryKubeconfigHandler := cluster.NewGetTemporaryKubeconfigHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getTemporaryKubeconfigEndpoint,
		Handler:  getTemporaryKubeconfigHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/prometheus/detect -> cluster.NewDetectPrometheusInstalledHandler
	detectPrometheusInstalledEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/prometheus/detect",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	detectPrometheusInstalledHandler := cluster.NewDetectPrometheusInstalledHandler(config)

	routes = append(routes, &Route{
		Endpoint: detectPrometheusInstalledEndpoint,
		Handler:  detectPrometheusInstalledHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/prometheus/ingresses -> cluster.NewListNGINXIngressesHandler
	listNGINXIngressesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/prometheus/ingresses",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listNGINXIngressesHandler := cluster.NewListNGINXIngressesHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listNGINXIngressesEndpoint,
		Handler:  listNGINXIngressesHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/metrics -> cluster.NewGetPodMetricsHandler
	getPodMetricsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/metrics",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getPodMetricsHandler := cluster.NewGetPodMetricsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getPodMetricsEndpoint,
		Handler:  getPodMetricsHandler,
		Router:   r,
	})

	return routes, newPath
}
