package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/release"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewReleaseScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetReleaseScopedRoutes,
		Children:  children,
	}
}

func GetReleaseScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
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
) ([]*router.Route, *types.Path) {
	relPath := "/releases/{name}/{version}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*router.Route, 0)

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

	routes = append(routes, &router.Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version}/form_stream -> release.NewStreamFormHandler
	streamFormEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/form_stream",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.ReleaseScope,
			},
			IsWebsocket: true,
		},
	)

	streamFormHandler := release.NewStreamFormHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: streamFormEndpoint,
		Handler:  streamFormHandler,
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

	routes = append(routes, &router.Route{
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

	routes = append(routes, &router.Route{
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

	routes = append(routes, &router.Route{
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

	routes = append(routes, &router.Route{
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

	routes = append(routes, &router.Route{
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

	routes = append(routes, &router.Route{
		Endpoint: getNotifsEndpoint,
		Handler:  getNotifsHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/buildconfig -> release.NewUpdateBuildConfigHandler
	updateBuildConfigEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/releases/{name}/buildconfig",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	updateBuildConfigHandler := release.NewUpdateBuildConfigHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateBuildConfigEndpoint,
		Handler:  updateBuildConfigHandler,
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

	routes = append(routes, &router.Route{
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
				RelativePath: relPath + "/webhook",
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

	routes = append(routes, &router.Route{
		Endpoint: createWebhookEndpoint,
		Handler:  createWebhookHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/steps -> release.NewGetReleaseStepsHandler
	getStepsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/releases/{name}/steps",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	getStepsHandler := release.NewGetReleaseStepsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getStepsEndpoint,
		Handler:  getStepsHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/steps -> release.NewUpdateReleaseStepsHandler
	updateStepsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/releases/{name}/steps",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	updateStepsHandler := release.NewUpdateReleaseStepsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateStepsEndpoint,
		Handler:  updateStepsHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases -> release.NewCreateReleaseHandler
	createReleaseEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/releases",
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

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/addons -> release.NewCreateAddonHandler
	createAddonEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/addons",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	createAddonHandler := release.NewCreateAddonHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createAddonEndpoint,
		Handler:  createAddonHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/gha_template -> release.NewGetGHATemplateHandler
	getGHATemplateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/releases/gha_template",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	getGHATemplateHandler := release.NewGetGHATemplateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getGHATemplateEndpoint,
		Handler:  getGHATemplateHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version}/rollback ->
	// release.NewRollbackReleaseHandler
	rollbackEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/rollback",
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

	rollbackHandler := release.NewRollbackReleaseHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: rollbackEndpoint,
		Handler:  rollbackHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version}/upgrade ->
	// release.NewUpgradeReleaseHandler
	upgradeEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/upgrade",
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

	// DELETE /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version} ->
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

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/image/batch ->
	// release.NewUpdateImageBatchHandler
	updateImageBatchEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/releases/image/batch",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	updateImageBatchHandler := release.NewUpdateImageBatchHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateImageBatchEndpoint,
		Handler:  updateImageBatchHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version}/jobs ->
	// release.NewGetJobsHandler
	getJobsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/jobs",
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

	getJobsHandler := release.NewGetJobsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getJobsEndpoint,
		Handler:  getJobsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version}/latest_job_run ->
	// release.NewGetLatestJobRunHandler
	getLatestJobRunEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/latest_job_run",
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

	getLatestJobRunHandler := release.NewGetLatestJobRunHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getLatestJobRunEndpoint,
		Handler:  getLatestJobRunHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version}/jobs/status ->
	// release.NewGetJobsHandler
	getJobsStatusEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/jobs/status",
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

	getJobsStatusHandler := release.NewGetJobsStatusHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getJobsStatusEndpoint,
		Handler:  getJobsStatusHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/subdomain -> release.NewCreateSubdomainHandler
	createSubdomainEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/releases/{name}/subdomain",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	createSubdomainHandler := release.NewCreateSubdomainHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createSubdomainEndpoint,
		Handler:  createSubdomainHandler,
		Router:   r,
	})

	// PATCH /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version}/update_tags ->
	// release.NewGetLatestJobRunHandler
	updateReleaseTagsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPatch,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/update_tags",
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

	updateReleaseTagsHandler := release.NewUpdateReleaseTagsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateReleaseTagsEndpoint,
		Handler:  updateReleaseTagsHandler,
		Router:   r,
	})

	return routes, newPath
}
