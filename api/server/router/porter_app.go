package router

import (
	"fmt"

	"github.com/go-chi/chi/v5"
	"github.com/porter-dev/porter/api/server/handlers/porter_app"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewPorterAppScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetPorterAppScopedRoutes,
		Children:  children,
	}
}

func GetPorterAppScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getPorterAppRoutes(r, config, basePath, factory)

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

func getPorterAppRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/applications"
	relPathV2 := "/apps"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// GET /api/projects/{project_id}/clusters/{cluster_id}/applications/{name} -> porter_app.NewPorterAppGetHandler
	getPorterAppEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getPorterAppHandler := porter_app.NewGetPorterAppHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getPorterAppEndpoint,
		Handler:  getPorterAppHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/applications/{name}/releases/{version} -> porter_app.NewPorterAppReleaseGetHandler
	getPorterAppHelmReleaseEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/releases/{%s}", relPath, types.URLParamPorterAppName, types.URLParamReleaseVersion),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getPorterAppHelmReleaseHandler := porter_app.NewPorterAppHelmReleaseGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getPorterAppHelmReleaseEndpoint,
		Handler:  getPorterAppHelmReleaseHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/applications/{name}/release-history -> porter_app.NewPorterAppHelmReleaseHistoryGetHandler
	getPorterAppHelmReleaseHistoryGetEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/release-history", relPath, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getPorterAppHelmReleaseHistoryGetHandler := porter_app.NewPorterAppHelmReleaseHistoryGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getPorterAppHelmReleaseHistoryGetEndpoint,
		Handler:  getPorterAppHelmReleaseHistoryGetHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/applications/{name}/releases/{version}/pods/all -> porter_app.NewPorterAppPodsGetHandler
	getPorterAppPodsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/releases/{%s}/pods/all", relPath, types.URLParamPorterAppName, types.URLParamReleaseVersion),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getPorterAppPodsHandler := porter_app.NewPorterAppPodsGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getPorterAppPodsEndpoint,
		Handler:  getPorterAppPodsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/applications -> porter_app.NewPorterAppListHandler
	listPorterAppEndpoint := factory.NewAPIEndpoint(
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
				types.ClusterScope,
			},
		},
	)

	listPorterAppHandler := porter_app.NewPorterAppListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listPorterAppEndpoint,
		Handler:  listPorterAppHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/clusters/{cluster_id}/applications/{porter_app_name} -> release.NewDeletePorterAppByNameHandler
	deletePorterAppByNameEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	deletePorterAppByNameHandler := porter_app.NewDeletePorterAppByNameHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deletePorterAppByNameEndpoint,
		Handler:  deletePorterAppByNameHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/applications/{porter_app_name} -> porter_app.NewCreatePorterAppHandler
	createPorterAppEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createPorterAppHandler := porter_app.NewCreatePorterAppHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createPorterAppEndpoint,
		Handler:  createPorterAppHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/applications/{porter_app_name}/rollback -> porter_app.NewRollbackPorterAppHandler
	rollbackPorterAppEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/rollback", relPath, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	rollbackPorterAppHandler := porter_app.NewRollbackPorterAppHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: rollbackPorterAppEndpoint,
		Handler:  rollbackPorterAppHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/applications/{porter_app_name}/pr -> porter_app.NewOpenStackPRHandler
	createSecretAndOpenGitHubPullRequestEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/pr", relPath, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createSecretAndOpenGitHubPullRequestHandler := porter_app.NewOpenStackPRHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createSecretAndOpenGitHubPullRequestEndpoint,
		Handler:  createSecretAndOpenGitHubPullRequestHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/applications/{porter_app_name}/events -> porter_app.NewPorterAppEventListHandler
	listPorterAppEventsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/events", relPath, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listPorterAppEventsHandler := porter_app.NewPorterAppEventListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listPorterAppEventsEndpoint,
		Handler:  listPorterAppEventsHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/applications/{name}/events -> porter_app.NewCreatePorterAppEventHandler
	createPorterAppEventEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/events", relPath, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createPorterAppEventHandler := porter_app.NewCreateUpdatePorterAppEventHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createPorterAppEventEndpoint,
		Handler:  createPorterAppEventHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/events/id -> porter_app.NewGetPorterAppEventHandler
	getPorterAppEventEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("/events/{%s}", types.URLParamPorterAppEventID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getPorterAppEventHandler := porter_app.NewGetPorterAppEventHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getPorterAppEventEndpoint,
		Handler:  getPorterAppEventHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/applications/analytics -> porter_app.NewPorterAppAnalyticsHandler
	porterAppAnalyticsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/analytics", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	porterAppAnalyticsHandler := porter_app.NewPorterAppAnalyticsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: porterAppAnalyticsEndpoint,
		Handler:  porterAppAnalyticsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/applications/logs -> cluster.NewGetChartLogsWithinTimeRangeHandler
	getChartLogsWithinTimeRangeEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/logs", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getChartLogsWithinTimeRangeHandler := porter_app.NewGetLogsWithinTimeRangeHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getChartLogsWithinTimeRangeEndpoint,
		Handler:  getChartLogsWithinTimeRangeHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/applications/{porter_app_name}/run -> porter_app.NewRunPorterAppCommandHandler
	runPorterAppCommandEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/run", relPath, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	runPorterAppCommandHandler := porter_app.NewRunPorterAppCommandHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: runPorterAppCommandEndpoint,
		Handler:  runPorterAppCommandHandler,
		Router:   r,
	})

	// TODO: remove these three endpoints once these three 'stacks' routes are no longer used in telemetry

	// GET /api/projects/{project_id}/clusters/{cluster_id}/stacks/{name} -> porter_app.NewPorterAppGetHandler
	LEGACY_getPorterAppEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("/stacks/{%s}", types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	LEGACY_getPorterAppHandler := porter_app.NewGetPorterAppHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: LEGACY_getPorterAppEndpoint,
		Handler:  LEGACY_getPorterAppHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/stacks/{porter_app_name} -> porter_app.NewCreatePorterAppHandler
	LEGACY_createPorterAppEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("/stacks/{%s}", types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	LEGACY_createPorterAppHandler := porter_app.NewCreatePorterAppHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: LEGACY_createPorterAppEndpoint,
		Handler:  LEGACY_createPorterAppHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/stacks/{name}/events -> porter_app.NewCreatePorterAppEventHandler
	LEGACY_createPorterAppEventEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("/stacks/{%s}/events", types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	LEGACY_createPorterAppEventHandler := porter_app.NewCreateUpdatePorterAppEventHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: LEGACY_createPorterAppEventEndpoint,
		Handler:  LEGACY_createPorterAppEventHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/apps/parse -> porter_app.NewParsePorterYAMLToProtoHandler
	parsePorterYAMLToProtoEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/parse", relPathV2),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	parsePorterYAMLToProtoHandler := porter_app.NewParsePorterYAMLToProtoHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: parsePorterYAMLToProtoEndpoint,
		Handler:  parsePorterYAMLToProtoHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/apps/validate -> porter_app.NewValidatePorterAppHandler
	validatePorterAppEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/validate", relPathV2),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	validatePorterAppHandler := porter_app.NewValidatePorterAppHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: validatePorterAppEndpoint,
		Handler:  validatePorterAppHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/apps/create -> porter_app.NewCreateAppHandler
	createAppEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/create", relPathV2),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createAppHandler := porter_app.NewCreateAppHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createAppEndpoint,
		Handler:  createAppHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/apps/apply -> porter_app.NewApplyPorterAppHandler
	applyPorterAppEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/apply", relPathV2),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	applyPorterAppHandler := porter_app.NewApplyPorterAppHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: applyPorterAppEndpoint,
		Handler:  applyPorterAppHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/default-deployment-target -> porter_app.NewDefaultDeploymentTargetHandler
	defaultDeploymentTargetEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/default-deployment-target",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	defaultDeploymentTargetHandler := porter_app.NewDefaultDeploymentTargetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: defaultDeploymentTargetEndpoint,
		Handler:  defaultDeploymentTargetHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/apps/{porter_app_name}/latest -> porter_app.NewCurrentAppRevisionHandler
	currentAppRevisionEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/latest", relPathV2, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	currentAppRevisionHandler := porter_app.NewLatestAppRevisionHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: currentAppRevisionEndpoint,
		Handler:  currentAppRevisionHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/apps/{porter_app_name}/revisions -> porter_app.NewCurrentAppRevisionHandler
	listAppRevisionsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/revisions", relPathV2, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listAppRevisionsHandler := porter_app.NewListAppRevisionsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listAppRevisionsEndpoint,
		Handler:  listAppRevisionsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/apps/revisions -> porter_app.NewCurrentAppRevisionHandler
	latestAppRevisionsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/revisions", relPathV2),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	latestAppRevisionsHandler := porter_app.NewLatestAppRevisionsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: latestAppRevisionsEndpoint,
		Handler:  latestAppRevisionsHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/apps/{porter_app_name}/subdomain -> porter_app.NewCreateSubdomainHandler
	createSubdomainEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/subdomain", relPathV2, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createSubdomainHandler := porter_app.NewCreateSubdomainHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createSubdomainEndpoint,
		Handler:  createSubdomainHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/apps/{porter_app_name}/{app_revision_id}/predeploy-status -> porter_app.NewPredeployStatusHandler
	predeployStatusEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/{%s}/predeploy-status", relPathV2, types.URLParamPorterAppName, types.URLParamAppRevisionID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	predeployStatusHandler := porter_app.NewPredeployStatusHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: predeployStatusEndpoint,
		Handler:  predeployStatusHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/apps/logs -> cluster.NewAppLogsHandler
	appLogsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/logs", relPathV2),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	appLogsHandler := porter_app.NewAppLogsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: appLogsEndpoint,
		Handler:  appLogsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/apps/logs/loki -> namespace.NewStreamLogsLokiHandler
	streamLogsLokiEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/logs/loki", relPathV2),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
			IsWebsocket: true,
		},
	)

	streamLogsLokiHandler := porter_app.NewStreamLogsLokiHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: streamLogsLokiEndpoint,
		Handler:  streamLogsLokiHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/apps/metrics -> cluster.NewGetPodMetricsHandler
	appMetricsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/metrics", relPathV2),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	appMetricsHandler := porter_app.NewAppMetricsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: appMetricsEndpoint,
		Handler:  appMetricsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/apps/status -> cluster.NewAppStatusHandler
	appStatusEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/status", relPathV2, types.URLParamKind),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
			IsWebsocket: true,
		},
	)

	appStatusHandler := porter_app.NewAppStatusHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: appStatusEndpoint,
		Handler:  appStatusHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/apps/pods -> cluster.NewPodStatusHandler
	appPodStatusEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/pods", relPathV2),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	appPodStatusHandler := porter_app.NewPodStatusHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: appPodStatusEndpoint,
		Handler:  appPodStatusHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/apps/{porter_app_name}/revisions/{app_revision_id} -> porter_app.NewUpdateAppRevisionStatusHandler
	updateAppRevisionStatusEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("/apps/{%s}/revisions/{%s}", types.URLParamPorterAppName, types.URLParamAppRevisionID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	updateAppRevisionStatusHandler := porter_app.NewUpdateAppRevisionStatusHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateAppRevisionStatusEndpoint,
		Handler:  updateAppRevisionStatusHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/apps/build-env -> porter_app.NewGetBuildEnvHandler
	getBuildEnvEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/apps/build-env",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getBuildEnvHandler := porter_app.NewGetBuildEnvHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getBuildEnvEndpoint,
		Handler:  getBuildEnvHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/apps/{porter_app_name}/update-environment -> porter_app.NewUpdateAppEnvironmentHandler
	updateAppEnvironmentGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("/apps/{%s}/update-environment", types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	updateAppEnvironmentGroupHandler := porter_app.NewUpdateAppEnvironmentHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateAppEnvironmentGroupEndpoint,
		Handler:  updateAppEnvironmentGroupHandler,
		Router:   r,
	})

	return routes, newPath
}
