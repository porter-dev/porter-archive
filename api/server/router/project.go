package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/cluster"
	"github.com/porter-dev/porter/api/server/handlers/gitinstallation"
	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/handlers/provision"
	"github.com/porter-dev/porter/api/server/handlers/registry"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

func NewProjectScopedRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		GetRoutes: GetProjectScopedRoutes,
		Children:  children,
	}
}

func GetProjectScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
	routes, projPath := getProjectRoutes(r, config, basePath, factory)

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

func getProjectRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*Route, *types.Path) {
	relPath := "/projects/{project_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*Route, 0)

	// GET /api/projects/{project_id} -> project.NewProjectGetHandler
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
			},
		},
	)

	getHandler := project.NewProjectGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/policy -> project.NewProjectGetPolicyHandler
	getPolicyEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/policy",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getPolicyHandler := project.NewProjectGetPolicyHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getPolicyEndpoint,
		Handler:  getPolicyHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/infra -> project.NewListProjectInfraHandler
	listInfraEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/infra",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listInfraHandler := project.NewProjectListInfraHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listInfraEndpoint,
		Handler:  listInfraHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters -> cluster.NewClusterListHandler
	listClusterEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/clusters",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listClusterHandler := cluster.NewClusterListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listClusterEndpoint,
		Handler:  listClusterHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/gitrepos -> gitinstallation.NewGitRepoListHandler
	listGitReposEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/gitrepos",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listGitReposHandler := gitinstallation.NewGitRepoListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listGitReposEndpoint,
		Handler:  listGitReposHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/registries -> registry.NewRegistryListHandler
	listRegistriesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/registries",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listRegistriesHandler := registry.NewRegistryListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listRegistriesEndpoint,
		Handler:  listRegistriesHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/registries -> registry.NewRegistryCreateHandler
	createRegistryEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/registries",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	createRegistryHandler := registry.NewRegistryCreateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createRegistryEndpoint,
		Handler:  createRegistryHandler,
		Router:   r,
	})

	//  GET /api/projects/{project_id}/registries/ecr/token -> registry.NewRegistryGetECRTokenHandler
	getECRTokenEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/registries/ecr/token",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getECRTokenHandler := registry.NewRegistryGetECRTokenHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getECRTokenEndpoint,
		Handler:  getECRTokenHandler,
		Router:   r,
	})

	//  GET /api/projects/{project_id}/registries/docr/token -> registry.NewRegistryGetDOCRTokenHandler
	getDOCRTokenEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/registries/docr/token",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getDOCRTokenHandler := registry.NewRegistryGetDOCRTokenHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getDOCRTokenEndpoint,
		Handler:  getDOCRTokenHandler,
		Router:   r,
	})

	//  GET /api/projects/{project_id}/registries/gcr/token -> registry.NewRegistryGetGCRTokenHandler
	getGCRTokenEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/registries/gcr/token",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getGCRTokenHandler := registry.NewRegistryGetGCRTokenHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getGCRTokenEndpoint,
		Handler:  getGCRTokenHandler,
		Router:   r,
	})

	//  GET /api/projects/{project_id}/registries/dockerhub/token -> registry.NewRegistryGetDockerhubTokenHandler
	getDockerhubTokenEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/registries/dockerhub/token",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getDockerhubTokenHandler := registry.NewRegistryGetDockerhubTokenHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getDockerhubTokenEndpoint,
		Handler:  getDockerhubTokenHandler,
		Router:   r,
	})

	//  POST /api/projects/{project_id}/provision/ecr -> provision.NewProvisionECRHandler
	provisionECREndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/provision/ecr",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	provisionECRHandler := provision.NewProvisionECRHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: provisionECREndpoint,
		Handler:  provisionECRHandler,
		Router:   r,
	})

	//  POST /api/projects/{project_id}/provision/eks -> provision.NewProvisionEKSHandler
	provisionEKSEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/provision/eks",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	provisionEKSHandler := provision.NewProvisionEKSHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: provisionEKSEndpoint,
		Handler:  provisionEKSHandler,
		Router:   r,
	})

	return routes, newPath
}
