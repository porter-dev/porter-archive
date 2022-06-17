package router

import (
	"fmt"

	"github.com/go-chi/chi"
	project_integration "github.com/porter-dev/porter/api/server/handlers/project_integration"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewProjectIntegrationScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetProjectIntegrationScopedRoutes,
		Children:  children,
	}
}

func GetProjectIntegrationScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getProjectIntegrationRoutes(r, config, basePath, factory)

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

func getProjectIntegrationRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/integrations"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*router.Route, 0)

	// GET /api/projects/{project_id}/integrations/oauth -> project_integration.NewListOAuthHandler
	listOAuthEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/oauth",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listOAuthHandler := project_integration.NewListOAuthHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listOAuthEndpoint,
		Handler:  listOAuthHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/integrations/do -> project_integration.NewListDOHandler
	listDOEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/do",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listDOHandler := project_integration.NewListDOHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listDOEndpoint,
		Handler:  listDOHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/integrations/basic -> project_integration.NewCreateBasicHandler
	createBasicEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/basic",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	createBasicHandler := project_integration.NewCreateBasicHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createBasicEndpoint,
		Handler:  createBasicHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/integrations/aws -> project_integration.NewCreateAWSHandler
	createAWSEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/aws",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	createAWSHandler := project_integration.NewCreateAWSHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createAWSEndpoint,
		Handler:  createAWSHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/integrations/aws -> project_integration.NewListAWSHandler
	listAWSEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/aws",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listAWSHandler := project_integration.NewListAWSHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listAWSEndpoint,
		Handler:  listAWSHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/integrations/aws/overwrite -> project_integration.NewOverwriteAWSHandler
	overwriteAWSEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/aws/overwrite",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	overwriteAWSHandler := project_integration.NewOverwriteAWSHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: overwriteAWSEndpoint,
		Handler:  overwriteAWSHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/integrations/azure -> project_integration.NewListAzureHandler
	listAzureEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/azure",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listAzureHandler := project_integration.NewListAzureHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listAzureEndpoint,
		Handler:  listAzureHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/integrations/gcp -> project_integration.NewCreateGCPHandler
	createGCPEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/gcp",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	createGCPHandler := project_integration.NewCreateGCPHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createGCPEndpoint,
		Handler:  createGCPHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/integrations/gcp -> project_integration.NewListGCPHandler
	listGCPEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/gcp",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listGCPHandler := project_integration.NewListGCPHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listGCPEndpoint,
		Handler:  listGCPHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/integrations/azure -> project_integration.NewCreateAzureHandler
	createAzureEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/azure",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	createAzureHandler := project_integration.NewCreateAzureHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createAzureEndpoint,
		Handler:  createAzureHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/integrations/gitlab
	listGitlabEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/gitlab",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listGitlabHandler := project_integration.NewListGitlabHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listGitlabEndpoint,
		Handler:  listGitlabHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/integrations/gitlab
	createGitlabEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/gitlab",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	createGitlabHandler := project_integration.NewCreateGitlabIntegration(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createGitlabEndpoint,
		Handler:  createGitlabHandler,
		Router:   r,
	})

	// PATCH /api/projects/{project_id}/integrations/gitlab/{integration_id}

	// DELETE /api/projects/{project_id}/integrations/gitlab/{integration_id}

	// GET /api/projects/{project_id}/integrations/git
	listGitIntegrationsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/git",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listGitIntegrationsHandler := project_integration.NewListGitIntegrationHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listGitIntegrationsEndpoint,
		Handler:  listGitIntegrationsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/integrations/gitlab/{integration_id}/repos
	listGitlabReposEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/gitlab/{%s}/repos", relPath, types.URLParamIntegrationID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitlabIntegrationScope,
			},
		},
	)

	listGitlabReposHandler := project_integration.NewListGitlabReposHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listGitlabReposEndpoint,
		Handler:  listGitlabReposHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/integrations/gitlab/{integration_id}/repos/{owner}/{name}/branches
	listGitlabRepoBranchesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf("%s/gitlab/{%s}/repos/{%s}/{%s}/branches",
					relPath, types.URLParamIntegrationID, types.URLParamGitRepoOwner, types.URLParamGitRepoName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitlabIntegrationScope,
			},
		},
	)

	listGitlabRepoBranchesHandler := project_integration.NewListGitlabRepoBranchesHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listGitlabRepoBranchesEndpoint,
		Handler:  listGitlabRepoBranchesHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/integrations/gitlab/{integration_id}/repos/{owner}/{name}/{branch}/contents
	getGitlabRepoContentsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf("%s/gitlab/{%s}/repos/{%s}/{%s}/{%s}/contents", relPath,
					types.URLParamIntegrationID, types.URLParamGitRepoOwner,
					types.URLParamGitRepoName, types.URLParamGitBranch),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitlabIntegrationScope,
			},
		},
	)

	getGitlabRepoContentsHandler := project_integration.NewGetGitlabRepoContentsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getGitlabRepoContentsEndpoint,
		Handler:  getGitlabRepoContentsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/integrations/gitlab/{integration_id}/repos/{owner}/{name}/{branch}/buildpack/detect
	getGitlabRepoBuildpackEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf("%s/gitlab/{%s}/repos/{%s}/{%s}/{%s}/buildpack/detect", relPath,
					types.URLParamIntegrationID, types.URLParamGitRepoOwner,
					types.URLParamGitRepoName, types.URLParamGitBranch),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitlabIntegrationScope,
			},
		},
	)

	getGitlabRepoBuildpackHandler := project_integration.NewGetGitlabRepoBuildpackHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getGitlabRepoBuildpackEndpoint,
		Handler:  getGitlabRepoBuildpackHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/integrations/gitlab/{integration_id}/repos/{owner}/{name}/{branch}/procfile
	getGitlabRepoProcfileEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf("%s/gitlab/{%s}/repos/{%s}/{%s}/{%s}/procfile", relPath,
					types.URLParamIntegrationID, types.URLParamGitRepoOwner,
					types.URLParamGitRepoName, types.URLParamGitBranch),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.GitlabIntegrationScope,
			},
		},
	)

	getGitlabRepoProcfileHandler := project_integration.NewGetGitlabRepoProcfileHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getGitlabRepoProcfileEndpoint,
		Handler:  getGitlabRepoProcfileHandler,
		Router:   r,
	})

	return routes, newPath
}
