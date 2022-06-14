package router

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/cluster"
	"github.com/porter-dev/porter/api/server/handlers/database"
	"github.com/porter-dev/porter/api/server/handlers/environment"
	"github.com/porter-dev/porter/api/server/handlers/kube_events"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewClusterScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetClusterScopedRoutes,
		Children:  children,
	}
}

func GetClusterScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
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
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/clusters/{cluster_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*router.Route, 0)

	// POST /api/projects/{project_id}/clusters -> project.NewCreateClusterManualHandler
	createEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/clusters",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	createHandler := cluster.NewCreateClusterManualHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createEndpoint,
		Handler:  createHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/candidates -> project.NewCreateClusterCandidateHandler
	createCandidateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/clusters/candidates",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
			CheckUsage:  true,
			UsageMetric: types.Clusters,
		},
	)

	createCandidateHandler := cluster.NewCreateClusterCandidateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createCandidateEndpoint,
		Handler:  createCandidateHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/candidates -> project.NewListClusterCandidatesHandler
	listCandidatesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/clusters/candidates",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listCandidatesHandler := cluster.NewListClusterCandidatesHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listCandidatesEndpoint,
		Handler:  listCandidatesHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/candidates/{candidate_id}/resolve -> project.NewResolveClusterCandidateHandler
	resolveCandidateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"/clusters/candidates/{%s}/resolve",
					types.URLParamCandidateID,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
			CheckUsage:  true,
			UsageMetric: types.Clusters,
		},
	)

	resolveCandidateHandler := cluster.NewResolveClusterCandidateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: resolveCandidateEndpoint,
		Handler:  resolveCandidateHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id} -> project.NewClusterUpdateHandler
	updateClusterEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
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

	updateClusterHandler := cluster.NewClusterUpdateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateClusterEndpoint,
		Handler:  updateClusterHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/clusters/{cluster_id} -> project.NewClusterDeleteHandler
	deleteClusterEndpoint := factory.NewAPIEndpoint(
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
			},
		},
	)

	deleteClusterHandler := cluster.NewClusterDeleteHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteClusterEndpoint,
		Handler:  deleteClusterHandler,
		Router:   r,
	})

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

	routes = append(routes, &router.Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/databases -> database.NewDatabaseListHandler
	listDatabaseEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/databases",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listDatabaseHandler := database.NewDatabaseListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listDatabaseEndpoint,
		Handler:  listDatabaseHandler,
		Router:   r,
	})

	if config.ServerConf.GithubIncomingWebhookSecret != "" {

		// GET /api/projects/{project_id}/clusters/{cluster_id}/environments -> environment.NewListEnvironmentHandler
		listEnvEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbGet,
				Method: types.HTTPVerbGet,
				Path: &types.Path{
					Parent:       basePath,
					RelativePath: relPath + "/environments",
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.ClusterScope,
				},
			},
		)

		listEnvHandler := environment.NewListEnvironmentHandler(
			config,
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: listEnvEndpoint,
			Handler:  listEnvHandler,
			Router:   r,
		})

		// GET /api/projects/{project_id}/clusters/{cluster_id}/deployments -> environment.NewListDeploymentsByClusterHandler
		listDeploymentsEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbGet,
				Method: types.HTTPVerbGet,
				Path: &types.Path{
					Parent:       basePath,
					RelativePath: relPath + "/deployments",
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.ClusterScope,
				},
			},
		)

		listDeploymentsHandler := environment.NewListDeploymentsByClusterHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: listDeploymentsEndpoint,
			Handler:  listDeploymentsHandler,
			Router:   r,
		})

		// GET /api/projects/{project_id}/clusters/{cluster_id}/{environment_id}/deployment -> environment.NewGetDeploymentByClusterHandler
		getDeploymentEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbGet,
				Method: types.HTTPVerbGet,
				Path: &types.Path{
					Parent:       basePath,
					RelativePath: relPath + "/{environment_id}/deployment",
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.ClusterScope,
				},
			},
		)

		getDeploymentHandler := environment.NewGetDeploymentByClusterHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: getDeploymentEndpoint,
			Handler:  getDeploymentHandler,
			Router:   r,
		})

		// PATCH /api/projects/{project_id}/clusters/{cluster_id}/deployments/{deployment_id}/reenable -> environment.NewReenableDeploymentHandler
		reenableDeploymentEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbUpdate,
				Method: types.HTTPVerbPatch,
				Path: &types.Path{
					Parent:       basePath,
					RelativePath: relPath + "/deployments/{deployment_id}/reenable",
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.ClusterScope,
				},
			},
		)

		reenableDeploymentHandler := environment.NewReenableDeploymentHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: reenableDeploymentEndpoint,
			Handler:  reenableDeploymentHandler,
			Router:   r,
		})

		// POST /api/projects/{project_id}/clusters/{cluster_id}/deployments/{deployment_id}/trigger_workflow -> environment.NewTriggerDeploymentWorkflowHandler
		triggerDeploymentWorkflowEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbCreate,
				Method: types.HTTPVerbPost,
				Path: &types.Path{
					Parent:       basePath,
					RelativePath: relPath + "/deployments/{deployment_id}/trigger_workflow",
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.ClusterScope,
				},
			},
		)

		triggerDeploymentWorkflowHandler := environment.NewTriggerDeploymentWorkflowHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: triggerDeploymentWorkflowEndpoint,
			Handler:  triggerDeploymentWorkflowHandler,
			Router:   r,
		})

		// POST /api/projects/{project_id}/clusters/{cluster_id}/deployments/pull_request -> environment.NewEnablePullRequestHandler
		enablePullRequestEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbCreate,
				Method: types.HTTPVerbPost,
				Path: &types.Path{
					Parent:       basePath,
					RelativePath: relPath + "/deployments/pull_request",
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.ClusterScope,
				},
			},
		)

		enablePullRequestHandler := environment.NewEnablePullRequestHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: enablePullRequestEndpoint,
			Handler:  enablePullRequestHandler,
			Router:   r,
		})

		// DELETE /api/projects/{project_id}/clusters/{cluster_id}/deployments/{deployment_id} ->
		// environment.NewDeleteDeploymentHandler
		deleteDeploymentEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbDelete,
				Method: types.HTTPVerbDelete,
				Path: &types.Path{
					Parent:       basePath,
					RelativePath: relPath + "/deployments/{deployment_id}",
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.ClusterScope,
				},
			},
		)

		deleteDeploymentHandler := environment.NewDeleteDeploymentHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: deleteDeploymentEndpoint,
			Handler:  deleteDeploymentHandler,
			Router:   r,
		})

	}

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

	routes = append(routes, &router.Route{
		Endpoint: listNamespacesEndpoint,
		Handler:  listNamespacesHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/nodes -> cluster.NewListNodesHandler
	listNodesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/nodes",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listNodesHandler := cluster.NewListNodesHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listNodesEndpoint,
		Handler:  listNodesHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/nodes/{node_name} -> cluster.NewGetNodeHandler
	getNodeEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/nodes/{%s}", relPath, types.URLParamNodeName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getNodeHandler := cluster.NewGetNodeHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getNodeEndpoint,
		Handler:  getNodeHandler,
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

	routes = append(routes, &router.Route{
		Endpoint: createNamespaceEndpoint,
		Handler:  createNamespaceHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace} -> cluster.NewDeleteNamespaceHandler
	deleteNamespaceEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/namespaces/{%s}", relPath, types.URLParamNamespace),
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

	routes = append(routes, &router.Route{
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

	routes = append(routes, &router.Route{
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

	routes = append(routes, &router.Route{
		Endpoint: detectPrometheusInstalledEndpoint,
		Handler:  detectPrometheusInstalledHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/agent/detect -> cluster.NewDetectAgentInstalledHandler
	detectAgentInstalledEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/agent/detect",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	detectAgentInstalledHandler := cluster.NewDetectAgentInstalledHandler(config, factory.GetResultWriter())

	routes = append(routes, &router.Route{
		Endpoint: detectAgentInstalledEndpoint,
		Handler:  detectAgentInstalledHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/agent/install -> cluster.NewInstallAgentHandler
	installAgentEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/agent/install",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	installAgentHandler := cluster.NewInstallAgentHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: installAgentEndpoint,
		Handler:  installAgentHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/agent/upgrade -> cluster.NewInstallAgentHandler
	upgradeAgentEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/agent/upgrade",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	upgradeAgentHandler := cluster.NewUpgradeAgentHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: upgradeAgentEndpoint,
		Handler:  upgradeAgentHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/kube_events -> kube_events.NewGetKubeEventHandler
	listKubeEventsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/kube_events",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listKubeEventsHandler := kube_events.NewListKubeEventsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listKubeEventsEndpoint,
		Handler:  listKubeEventsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/kube_events -> kube_events.NewGetKubeEventHandler
	getKubeEventEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/kube_events/{%s}", relPath, types.URLParamKubeEventID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getKubeEventHandler := kube_events.NewGetKubeEventHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getKubeEventEndpoint,
		Handler:  getKubeEventHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/kube_events/{kube_event_id}/logs -> kube_events.NewGetKubeEventLogsHandler
	getKubeEventLogsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/kube_events/{%s}/logs", relPath, types.URLParamKubeEventID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getKubeEventLogsHandler := kube_events.NewGetKubeEventLogsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getKubeEventLogsEndpoint,
		Handler:  getKubeEventLogsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/kube_events/{kube_event_id}/log_buckets -> kube_events.NewGetKubeEventLogBucketsHandler
	getKubeEventLogBucketsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/kube_events/{%s}/log_buckets", relPath, types.URLParamKubeEventID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getKubeEventLogBucketsHandler := kube_events.NewGetKubeEventLogBucketsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getKubeEventLogBucketsEndpoint,
		Handler:  getKubeEventLogBucketsHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/kube_events -> kube_events.NewCreateKubeEventHandler
	createKubeEventsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/kube_events",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createKubeEventsHandler := kube_events.NewCreateKubeEventHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createKubeEventsEndpoint,
		Handler:  createKubeEventsHandler,
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

	routes = append(routes, &router.Route{
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

	routes = append(routes, &router.Route{
		Endpoint: getPodMetricsEndpoint,
		Handler:  getPodMetricsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/helm_release -> cluster.NewStreamHelmReleaseHandler
	streamHelmReleaseEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/helm_release",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
			IsWebsocket: true,
		},
	)

	streamHelmReleaseHandler := cluster.NewStreamHelmReleaseHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: streamHelmReleaseEndpoint,
		Handler:  streamHelmReleaseHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/{kind}/status -> cluster.NewStreamStatusHandler
	streamStatusEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"%s/{%s}/status",
					relPath,
					types.URLParamKind,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
			IsWebsocket: true,
		},
	)

	streamStatusHandler := cluster.NewStreamStatusHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: streamStatusEndpoint,
		Handler:  streamStatusHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/pods -> cluster.NewGetPodsHandler
	getPodsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/pods",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getPodsHandler := cluster.NewGetPodsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getPodsEndpoint,
		Handler:  getPodsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/incidents -> cluster.NewGetIncidentsHandler
	getIncidentsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/incidents",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getIncidentsHandler := cluster.NewGetIncidentsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getIncidentsEndpoint,
		Handler:  getIncidentsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/incidents/logs -> cluster.NewGetIncidentsHandler
	getIncidentEventLogsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/incidents/logs",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getIncidentEventLogsHandler := cluster.NewGetIncidentEventLogsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getIncidentEventLogsEndpoint,
		Handler:  getIncidentEventLogsHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/incidents/notify_new -> cluster.NewNotifyNewIncidentHandler
	notifyNewIncidentEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/incidents/notify_new",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	notifyNewIncidentHandler := cluster.NewNotifyNewIncidentHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: notifyNewIncidentEndpoint,
		Handler:  notifyNewIncidentHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/incidents/notify_resolved -> cluster.NewNotifyResolvedIncidentHandler
	notifyResolvedIncidentEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/incidents/notify_resolved",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	notifyResolvedIncidentHandler := cluster.NewNotifyResolvedIncidentHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: notifyResolvedIncidentEndpoint,
		Handler:  notifyResolvedIncidentHandler,
		Router:   r,
	})

	return routes, newPath
}
