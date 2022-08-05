package router

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/environment"
	"github.com/porter-dev/porter/api/server/handlers/gitinstallation"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewGitInstallationScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetGitInstallationScopedRoutes,
		Children:  children,
	}
}

func GetGitInstallationScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getGitInstallationRoutes(r, config, basePath, factory)

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

func getGitInstallationRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/gitrepos/{git_installation_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*router.Route, 0)

	// GET /api/projects/{project_id}/gitrepos/{git_installation_id} -> gitinstallation.NewGitInstallationGetHandler
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
				types.GitInstallationScope,
			},
		},
	)

	getHandler := gitinstallation.NewGitInstallationGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/gitrepos/{git_installation_id}/permissions -> gitinstallation.NewGithubGetPermissionsHandler
	getPermissionsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/permissions",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitInstallationScope,
			},
		},
	)

	getPermissionsHandler := gitinstallation.NewGithubGetPermissionsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getPermissionsEndpoint,
		Handler:  getPermissionsHandler,
		Router:   r,
	})

	if config.ServerConf.GithubIncomingWebhookSecret != "" {

		// POST /api/projects/{project_id}/gitrepos/{git_installation_id}/{owner}/{name}/clusters/{cluster_id}/environment ->
		// environment.NewCreateEnvironmentHandler
		createEnvironmentEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbCreate,
				Method: types.HTTPVerbPost,
				Path: &types.Path{
					Parent: basePath,
					RelativePath: fmt.Sprintf(
						"%s/{%s}/{%s}/clusters/{cluster_id}/environment",
						relPath,
						types.URLParamGitRepoOwner,
						types.URLParamGitRepoName,
					),
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.GitInstallationScope,
					types.ClusterScope,
				},
			},
		)

		createEnvironmentHandler := environment.NewCreateEnvironmentHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: createEnvironmentEndpoint,
			Handler:  createEnvironmentHandler,
			Router:   r,
		})

		// POST /api/projects/{project_id}/gitrepos/{git_installation_id}/{owner}/{name}/clusters/{cluster_id}/deployment ->
		// environment.NewCreateDeploymentHandler
		createDeploymentEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbCreate,
				Method: types.HTTPVerbPost,
				Path: &types.Path{
					Parent: basePath,
					RelativePath: fmt.Sprintf(
						"%s/{%s}/{%s}/clusters/{cluster_id}/deployment",
						relPath,
						types.URLParamGitRepoOwner,
						types.URLParamGitRepoName,
					),
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.GitInstallationScope,
					types.ClusterScope,
				},
			},
		)

		createDeploymentHandler := environment.NewCreateDeploymentHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: createDeploymentEndpoint,
			Handler:  createDeploymentHandler,
			Router:   r,
		})

		// GET /api/projects/{project_id}/gitrepos/{git_installation_id}/{owner}/{name}/clusters/{cluster_id}/deployment ->
		// environment.NewGetDeploymentHandler
		getDeploymentEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbGet,
				Method: types.HTTPVerbGet,
				Path: &types.Path{
					Parent: basePath,
					RelativePath: fmt.Sprintf(
						"%s/{%s}/{%s}/clusters/{cluster_id}/deployment",
						relPath,
						types.URLParamGitRepoOwner,
						types.URLParamGitRepoName,
					),
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.GitInstallationScope,
					types.ClusterScope,
				},
			},
		)

		getDeploymentHandler := environment.NewGetDeploymentHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: getDeploymentEndpoint,
			Handler:  getDeploymentHandler,
			Router:   r,
		})

		// GET /api/projects/{project_id}/gitrepos/{git_installation_id}/{owner}/{name}/clusters/{cluster_id}/deployments ->
		// environment.NewCreateDeploymentHandler
		listDeploymentsEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbGet,
				Method: types.HTTPVerbGet,
				Path: &types.Path{
					Parent: basePath,
					RelativePath: fmt.Sprintf(
						"%s/{%s}/{%s}/clusters/{cluster_id}/deployments",
						relPath,
						types.URLParamGitRepoOwner,
						types.URLParamGitRepoName,
					),
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.GitInstallationScope,
					types.ClusterScope,
				},
			},
		)

		listDeploymentsHandler := environment.NewListDeploymentsHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: listDeploymentsEndpoint,
			Handler:  listDeploymentsHandler,
			Router:   r,
		})

		// POST /api/projects/{project_id}/gitrepos/{git_installation_id}/{owner}/{name}/clusters/{cluster_id}/deployment/finalize ->
		// environment.NewFinalizeDeploymentHandler
		finalizeDeploymentEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbCreate,
				Method: types.HTTPVerbPost,
				Path: &types.Path{
					Parent: basePath,
					RelativePath: fmt.Sprintf(
						"%s/{%s}/{%s}/clusters/{cluster_id}/deployment/finalize",
						relPath,
						types.URLParamGitRepoOwner,
						types.URLParamGitRepoName,
					),
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.GitInstallationScope,
					types.ClusterScope,
				},
			},
		)

		finalizeDeploymentHandler := environment.NewFinalizeDeploymentHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: finalizeDeploymentEndpoint,
			Handler:  finalizeDeploymentHandler,
			Router:   r,
		})

		// POST /api/projects/{project_id}/gitrepos/{git_installation_id}/{owner}/{name}/clusters/{cluster_id}/deployment/update ->
		// environment.NewFinalizeDeploymentHandler
		updateDeploymentEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbUpdate,
				Method: types.HTTPVerbPost,
				Path: &types.Path{
					Parent: basePath,
					RelativePath: fmt.Sprintf(
						"%s/{%s}/{%s}/clusters/{cluster_id}/deployment/update",
						relPath,
						types.URLParamGitRepoOwner,
						types.URLParamGitRepoName,
					),
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.GitInstallationScope,
					types.ClusterScope,
				},
			},
		)

		updateDeploymentHandler := environment.NewUpdateDeploymentHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: updateDeploymentEndpoint,
			Handler:  updateDeploymentHandler,
			Router:   r,
		})

		// POST /api/projects/{project_id}/gitrepos/{git_installation_id}/{owner}/{name}/clusters/{cluster_id}/deployment/update/status ->
		// environment.NewUpdateDeploymentStatusHandler
		updateDeploymentStatusEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbUpdate,
				Method: types.HTTPVerbPost,
				Path: &types.Path{
					Parent: basePath,
					RelativePath: fmt.Sprintf(
						"%s/{%s}/{%s}/clusters/{cluster_id}/deployment/update/status",
						relPath,
						types.URLParamGitRepoOwner,
						types.URLParamGitRepoName,
					),
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.GitInstallationScope,
					types.ClusterScope,
				},
			},
		)

		updateDeploymentStatusHandler := environment.NewUpdateDeploymentStatusHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: updateDeploymentStatusEndpoint,
			Handler:  updateDeploymentStatusHandler,
			Router:   r,
		})

		// POST /api/projects/{project_id}/gitrepos/{git_installation_id}/{owner}/{name}/clusters/{cluster_id}/deployment/finalize_errors ->
		// environment.NewFinalizeDeploymentWithErrorsHandler
		finalizeDeploymentWithErrorsEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbUpdate,
				Method: types.HTTPVerbPost,
				Path: &types.Path{
					Parent: basePath,
					RelativePath: fmt.Sprintf(
						"%s/{%s}/{%s}/clusters/{cluster_id}/deployment/finalize_errors",
						relPath,
						types.URLParamGitRepoOwner,
						types.URLParamGitRepoName,
					),
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.GitInstallationScope,
					types.ClusterScope,
				},
			},
		)

		finalizeDeploymentWithErrorsHandler := environment.NewFinalizeDeploymentWithErrorsHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: finalizeDeploymentWithErrorsEndpoint,
			Handler:  finalizeDeploymentWithErrorsHandler,
			Router:   r,
		})

		// DELETE /api/projects/{project_id}/gitrepos/{git_installation_id}/{owner}/{name}/clusters/{cluster_id}/environment ->
		// environment.NewDeleteEnvironmentHandler
		deleteEnvironmentEndpoint := factory.NewAPIEndpoint(
			&types.APIRequestMetadata{
				Verb:   types.APIVerbDelete,
				Method: types.HTTPVerbDelete,
				Path: &types.Path{
					Parent: basePath,
					RelativePath: fmt.Sprintf(
						"%s/{%s}/{%s}/clusters/{cluster_id}/environment",
						relPath,
						types.URLParamGitRepoOwner,
						types.URLParamGitRepoName,
					),
				},
				Scopes: []types.PermissionScope{
					types.UserScope,
					types.ProjectScope,
					types.GitInstallationScope,
					types.ClusterScope,
				},
			},
		)

		deleteEnvironmentHandler := environment.NewDeleteEnvironmentHandler(
			config,
			factory.GetDecoderValidator(),
			factory.GetResultWriter(),
		)

		routes = append(routes, &router.Route{
			Endpoint: deleteEnvironmentEndpoint,
			Handler:  deleteEnvironmentHandler,
			Router:   r,
		})

	}

	// GET /api/projects/{project_id}/gitrepos/{git_installation_id}/repos ->
	// gitinstallation.GithubListReposHandler
	listReposEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/repos",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitInstallationScope,
			},
		},
	)

	listReposHandler := gitinstallation.NewGithubListReposHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listReposEndpoint,
		Handler:  listReposHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/branches ->
	// gitinstallation.GithubListBranchesHandler
	listBranchesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"%s/repos/{%s}/{%s}/{%s}/branches",
					relPath,
					types.URLParamGitKind,
					types.URLParamGitRepoOwner,
					types.URLParamGitRepoName,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitInstallationScope,
			},
		},
	)

	listBranchesHandler := gitinstallation.NewGithubListBranchesHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listBranchesEndpoint,
		Handler:  listBranchesHandler,
		Router:   r,
	})

	//  GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/buildpack/detect ->
	// gitinstallation.NewGithubGetBuildpackHandler
	getBuildpackEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"%s/repos/{%s}/{%s}/{%s}/{%s}/buildpack/detect",
					relPath,
					types.URLParamGitKind,
					types.URLParamGitRepoOwner,
					types.URLParamGitRepoName,
					types.URLParamGitBranch,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitInstallationScope,
			},
		},
	)

	getBuildpackHandler := gitinstallation.NewGithubGetBuildpackHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getBuildpackEndpoint,
		Handler:  getBuildpackHandler,
		Router:   r,
	})

	//   GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/contents ->
	// gitinstallation.NewGithubGetContentsHandler
	getContentsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"%s/repos/{%s}/{%s}/{%s}/{%s}/contents",
					relPath,
					types.URLParamGitKind,
					types.URLParamGitRepoOwner,
					types.URLParamGitRepoName,
					types.URLParamGitBranch,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitInstallationScope,
			},
		},
	)

	getContentsHandler := gitinstallation.NewGithubGetContentsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getContentsEndpoint,
		Handler:  getContentsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/procfile ->
	// gitinstallation.NewGithubGetProcfileHandler
	getProcfileEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"%s/repos/{%s}/{%s}/{%s}/{%s}/procfile",
					relPath,
					types.URLParamGitKind,
					types.URLParamGitRepoOwner,
					types.URLParamGitRepoName,
					types.URLParamGitBranch,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitInstallationScope,
			},
		},
	)

	getProcfileHandler := gitinstallation.NewGithubGetProcfileHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getProcfileEndpoint,
		Handler:  getProcfileHandler,
		Router:   r,
	})

	//  GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/tarball_url ->
	// gitinstallation.NewGithubGetTarballURLHandler
	getTarballURLEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"%s/repos/{%s}/{%s}/{%s}/{%s}/tarball_url",
					relPath,
					types.URLParamGitKind,
					types.URLParamGitRepoOwner,
					types.URLParamGitRepoName,
					types.URLParamGitBranch,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitInstallationScope,
			},
		},
	)

	getTarballURLHandler := gitinstallation.NewGithubGetTarballURLHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getTarballURLEndpoint,
		Handler:  getTarballURLHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/gitrepos/{git_installation_id}/{owner}/{name}/clusters/{cluster_id}/rerun_workflow ->
	// gitinstallation.NewRerunWorkflowHandler
	rerunWorkflowEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"%s/{%s}/{%s}/clusters/{cluster_id}/rerun_workflow",
					relPath,
					types.URLParamGitRepoOwner,
					types.URLParamGitRepoName,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitInstallationScope,
				types.ClusterScope,
			},
		},
	)

	rerunWorkflowHandler := gitinstallation.NewRerunWorkflowHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: rerunWorkflowEndpoint,
		Handler:  rerunWorkflowHandler,
		Router:   r,
	})

	return routes, newPath
}
