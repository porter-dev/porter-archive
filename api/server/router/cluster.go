package router

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/cluster"
	"github.com/porter-dev/porter/api/server/handlers/database"
	"github.com/porter-dev/porter/api/server/handlers/environment"
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

		// GET /api/projects/{project_id}/clusters/{cluster_id}/environments/{environment_id} -> environment.NewGetEnvironmentHandler
		getEnvEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbGet,
				Method: types.HTTPVerbGet,
				Path: &types.Path{
					Parent:       basePath,
					RelativePath: relPath + "/environments/{environment_id}",
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.ClusterScope,
				},
			},
		)

		getEnvHandler := environment.NewGetEnvironmentHandler(
			config,
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: getEnvEndpoint,
			Handler:  getEnvHandler,
			Router:   r,
		})

		// PATCH /api/projects/{project_id}/clusters/{cluster_id}/environment/{environment_id}/toggle_new_comment -> environment.NewToggleNewCommentHandler
		toggleNewCommentEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbUpdate,
				Method: types.HTTPVerbPatch,
				Path: &types.Path{
					Parent:       basePath,
					RelativePath: relPath + "/environments/{environment_id}/toggle_new_comment",
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.ClusterScope,
				},
			},
		)

		toggleNewCommentHandler := environment.NewToggleNewCommentHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: toggleNewCommentEndpoint,
			Handler:  toggleNewCommentHandler,
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

		// GET /api/projects/{project_id}/clusters/{cluster_id}/environments/{environment_id}/deployment -> environment.NewGetDeploymentByClusterHandler
		getDeploymentEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbGet,
				Method: types.HTTPVerbGet,
				Path: &types.Path{
					Parent:       basePath,
					RelativePath: relPath + "/environments/{environment_id}/deployment",
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.ClusterScope,
				},
			},
		)

		getDeploymentHandler := environment.NewGetDeploymentByEnvironmentHandler(
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
			Verb:   types.APIVerbUpdate, // we do not want users with no-write access to be able to use this
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

	// GET /api/projects/{project_id}/clusters/{cluster_id}/agent/status -> cluster.NewGetAgentStatusHandler
	getAgentStatusEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/agent/status",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getAgentStatusHandler := cluster.NewGetAgentStatusHandler(config, factory.GetResultWriter())

	routes = append(routes, &router.Route{
		Endpoint: getAgentStatusEndpoint,
		Handler:  getAgentStatusHandler,
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

	// GET /api/projects/{project_id}/clusters/{cluster_id}/incidents -> cluster.NewListIncidentsHandler
	listIncidentsEndpoint := factory.NewAPIEndpoint(
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

	listIncidentsHandler := cluster.NewListIncidentsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listIncidentsEndpoint,
		Handler:  listIncidentsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/incidents/{incident_id} -> cluster.NewGetIncidentHandler
	getIncidentEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/incidents/{%s}", relPath, types.URLParamIncidentID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getIncidentHandler := cluster.NewGetIncidentHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getIncidentEndpoint,
		Handler:  getIncidentHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/incidents/events -> cluster.NewListIncidentEventsHandler
	listIncidentEventsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/incidents/events", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listIncidentEventsHandler := cluster.NewListIncidentEventsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listIncidentEventsEndpoint,
		Handler:  listIncidentEventsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/logs -> cluster.NewGetLogsHandler
	getLogsEndpoint := factory.NewAPIEndpoint(
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

	getLogsHandler := cluster.NewGetLogsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getLogsEndpoint,
		Handler:  getLogsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/logs/pod_values -> cluster.NewGetLogPodValuesHandler
	getLogPodValuesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/logs/pod_values", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getLogPodValuesHandler := cluster.NewGetLogPodValuesHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getLogPodValuesEndpoint,
		Handler:  getLogPodValuesHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/logs/revision_values -> cluster.NewGetLogPodValuesHandler
	getLogRevisionValuesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/logs/revision_values", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getLogRevisionValuesHandler := cluster.NewGetLogRevisionValuesHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getLogRevisionValuesEndpoint,
		Handler:  getLogRevisionValuesHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/events -> cluster.NewGetEventsHandler
	getPorterEventsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/events", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getPorterEventsHandler := cluster.NewGetPorterEventsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getPorterEventsEndpoint,
		Handler:  getPorterEventsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/events/job -> cluster.NewGetPorterJobEventsHandler
	getPorterJobEventsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/events/job", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getPorterJobEventsHandler := cluster.NewGetPorterJobEventsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getPorterJobEventsEndpoint,
		Handler:  getPorterJobEventsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/k8s_events -> cluster.NewGetEventsHandler
	getK8sEventsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/k8s_events", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getK8sEventsHandler := cluster.NewGetKubernetesEventsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getK8sEventsEndpoint,
		Handler:  getK8sEventsHandler,
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
