package router

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/billing"
	"github.com/porter-dev/porter/api/server/handlers/cluster"
	"github.com/porter-dev/porter/api/server/handlers/gitinstallation"
	"github.com/porter-dev/porter/api/server/handlers/helmrepo"
	"github.com/porter-dev/porter/api/server/handlers/infra"
	"github.com/porter-dev/porter/api/server/handlers/project"
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

	// DELETE /api/projects/{project_id} -> project.NewProjectDeleteHandler
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
			},
		},
	)

	deleteHandler := project.NewProjectDeleteHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: deleteEndpoint,
		Handler:  deleteHandler,
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

	// GET /api/projects/{project_id}/onboarding -> project.NewProjectGetOnboardingHandler
	getOnboardingEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/onboarding",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getOnboardingHandler := project.NewOnboardingGetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getOnboardingEndpoint,
		Handler:  getOnboardingHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/onboarding -> project.NewProjectGetOnboardingHandler
	updateOnboardingEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/onboarding",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	updateOnboardingHandler := project.NewOnboardingUpdateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: updateOnboardingEndpoint,
		Handler:  updateOnboardingHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/usage -> project.NewProjectGetUsageHandler
	getUsageEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/usage",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getUsageHandler := project.NewProjectGetUsageHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getUsageEndpoint,
		Handler:  getUsageHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/billing -> project.NewProjectGetBillingHandler
	getBillingEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/billing",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getBillingHandler := project.NewProjectGetBillingHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getBillingEndpoint,
		Handler:  getBillingHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/billing/token -> billing.NewBillingGetTokenEndpoint
	getBillingTokenEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/billing/token",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.SettingsScope,
			},
		},
	)

	getBillingTokenHandler := billing.NewBillingGetTokenHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getBillingTokenEndpoint,
		Handler:  getBillingTokenHandler,
		Router:   r,
	})

	// GET /api/billing_webhook -> billing.NewBillingWebhookHandler
	getBillingWebhookEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/billing_webhook",
			},
			Scopes: []types.PermissionScope{},
		},
	)

	getBillingWebhookHandler := billing.NewBillingWebhookHandler(
		config,
		factory.GetDecoderValidator(),
	)

	routes = append(routes, &Route{
		Endpoint: getBillingWebhookEndpoint,
		Handler:  getBillingWebhookHandler,
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

	// GET /api/projects/{project_id}/collaborators -> project.NewCollaboratorsListHandler
	listCollaboratorsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/collaborators",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listCollaboratorsHandler := project.NewCollaboratorsListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listCollaboratorsEndpoint,
		Handler:  listCollaboratorsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/roles -> project.NewRolesListHandler
	listRolesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/roles",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listRolesHandler := project.NewRolesListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listRolesEndpoint,
		Handler:  listRolesHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/roles -> project.NewRoleUpdateHandler
	updateRoleEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/roles",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	updateRoleHandler := project.NewRoleUpdateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: updateRoleEndpoint,
		Handler:  updateRoleHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/roles -> project.NewRoleDeleteHandler
	deleteRoleEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/roles",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	deleteRoleHandler := project.NewRoleDeleteHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: deleteRoleEndpoint,
		Handler:  deleteRoleHandler,
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

	//  GET /api/projects/{project_id}/registries/acr/token -> registry.NewRegistryGetACRTokenHandler
	getACRTokenEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/registries/acr/token",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getACRTokenHandler := registry.NewRegistryGetACRTokenHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getACRTokenEndpoint,
		Handler:  getACRTokenHandler,
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

	// POST /api/projects/{project_id}/infras -> infra.NewInfraCreateHandler
	createInfraEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/infras",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	createInfraHandler := infra.NewInfraCreateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createInfraEndpoint,
		Handler:  createInfraHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/infras/templates -> infra.NewInfraGetHandler
	getTemplatesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/infras/templates",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getTemplatesHandler := infra.NewInfraListTemplateHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getTemplatesEndpoint,
		Handler:  getTemplatesHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/infras/templates -> infra.NewInfraGetHandler
	getTemplateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/infras/templates/{%s}/{%s}", relPath, types.URLParamTemplateName, types.URLParamTemplateVersion),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getTemplateHandler := infra.NewInfraGetTemplateHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getTemplateEndpoint,
		Handler:  getTemplateHandler,
		Router:   r,
	})

	// //  POST /api/projects/{project_id}/provision/ecr -> provision.NewProvisionECRHandler
	// provisionECREndpoint := factory.NewAPIEndpoint(
	// 	&types.APIRequestMetadata{
	// 		Verb:   types.APIVerbCreate,
	// 		Method: types.HTTPVerbPost,
	// 		Path: &types.Path{
	// 			Parent:       basePath,
	// 			RelativePath: relPath + "/provision/ecr",
	// 		},
	// 		Scopes: []types.PermissionScope{
	// 			types.UserScope,
	// 			types.ProjectScope,
	// 		},
	// 	},
	// )

	// provisionECRHandler := provision.NewProvisionECRHandler(
	// 	config,
	// 	factory.GetDecoderValidator(),
	// 	factory.GetResultWriter(),
	// )

	// routes = append(routes, &Route{
	// 	Endpoint: provisionECREndpoint,
	// 	Handler:  provisionECRHandler,
	// 	Router:   r,
	// })

	// //  POST /api/projects/{project_id}/provision/eks -> provision.NewProvisionEKSHandler
	// provisionEKSEndpoint := factory.NewAPIEndpoint(
	// 	&types.APIRequestMetadata{
	// 		Verb:   types.APIVerbCreate,
	// 		Method: types.HTTPVerbPost,
	// 		Path: &types.Path{
	// 			Parent:       basePath,
	// 			RelativePath: relPath + "/provision/eks",
	// 		},
	// 		Scopes: []types.PermissionScope{
	// 			types.UserScope,
	// 			types.ProjectScope,
	// 		},
	// 		CheckUsage:  true,
	// 		UsageMetric: types.Clusters,
	// 	},
	// )

	// provisionEKSHandler := provision.NewProvisionEKSHandler(
	// 	config,
	// 	factory.GetDecoderValidator(),
	// 	factory.GetResultWriter(),
	// )

	// routes = append(routes, &Route{
	// 	Endpoint: provisionEKSEndpoint,
	// 	Handler:  provisionEKSHandler,
	// 	Router:   r,
	// })

	// //  POST /api/projects/{project_id}/provision/docr -> provision.NewProvisionDOCRHandler
	// provisionDOCREndpoint := factory.NewAPIEndpoint(
	// 	&types.APIRequestMetadata{
	// 		Verb:   types.APIVerbCreate,
	// 		Method: types.HTTPVerbPost,
	// 		Path: &types.Path{
	// 			Parent:       basePath,
	// 			RelativePath: relPath + "/provision/docr",
	// 		},
	// 		Scopes: []types.PermissionScope{
	// 			types.UserScope,
	// 			types.ProjectScope,
	// 		},
	// 	},
	// )

	// provisionDOCRHandler := provision.NewProvisionDOCRHandler(
	// 	config,
	// 	factory.GetDecoderValidator(),
	// 	factory.GetResultWriter(),
	// )

	// routes = append(routes, &Route{
	// 	Endpoint: provisionDOCREndpoint,
	// 	Handler:  provisionDOCRHandler,
	// 	Router:   r,
	// })

	// //  POST /api/projects/{project_id}/provision/doks -> provision.NewProvisionDOKSHandler
	// provisionDOKSEndpoint := factory.NewAPIEndpoint(
	// 	&types.APIRequestMetadata{
	// 		Verb:   types.APIVerbCreate,
	// 		Method: types.HTTPVerbPost,
	// 		Path: &types.Path{
	// 			Parent:       basePath,
	// 			RelativePath: relPath + "/provision/doks",
	// 		},
	// 		Scopes: []types.PermissionScope{
	// 			types.UserScope,
	// 			types.ProjectScope,
	// 		},
	// 		CheckUsage:  true,
	// 		UsageMetric: types.Clusters,
	// 	},
	// )

	// provisionDOKSHandler := provision.NewProvisionDOKSHandler(
	// 	config,
	// 	factory.GetDecoderValidator(),
	// 	factory.GetResultWriter(),
	// )

	// routes = append(routes, &Route{
	// 	Endpoint: provisionDOKSEndpoint,
	// 	Handler:  provisionDOKSHandler,
	// 	Router:   r,
	// })

	// //  POST /api/projects/{project_id}/provision/gcr -> provision.NewProvisionGCRHandler
	// provisionGCREndpoint := factory.NewAPIEndpoint(
	// 	&types.APIRequestMetadata{
	// 		Verb:   types.APIVerbCreate,
	// 		Method: types.HTTPVerbPost,
	// 		Path: &types.Path{
	// 			Parent:       basePath,
	// 			RelativePath: relPath + "/provision/gcr",
	// 		},
	// 		Scopes: []types.PermissionScope{
	// 			types.UserScope,
	// 			types.ProjectScope,
	// 		},
	// 	},
	// )

	// provisionGCRHandler := provision.NewProvisionGCRHandler(
	// 	config,
	// 	factory.GetDecoderValidator(),
	// 	factory.GetResultWriter(),
	// )

	// routes = append(routes, &Route{
	// 	Endpoint: provisionGCREndpoint,
	// 	Handler:  provisionGCRHandler,
	// 	Router:   r,
	// })

	// //  POST /api/projects/{project_id}/provision/gke -> provision.NewProvisionGKEHandler
	// provisionGKEEndpoint := factory.NewAPIEndpoint(
	// 	&types.APIRequestMetadata{
	// 		Verb:   types.APIVerbCreate,
	// 		Method: types.HTTPVerbPost,
	// 		Path: &types.Path{
	// 			Parent:       basePath,
	// 			RelativePath: relPath + "/provision/gke",
	// 		},
	// 		Scopes: []types.PermissionScope{
	// 			types.UserScope,
	// 			types.ProjectScope,
	// 		},
	// 		CheckUsage:  true,
	// 		UsageMetric: types.Clusters,
	// 	},
	// )

	// provisionGKEHandler := provision.NewProvisionGKEHandler(
	// 	config,
	// 	factory.GetDecoderValidator(),
	// 	factory.GetResultWriter(),
	// )

	// routes = append(routes, &Route{
	// 	Endpoint: provisionGKEEndpoint,
	// 	Handler:  provisionGKEHandler,
	// 	Router:   r,
	// })

	//  POST /api/projects/{project_id}/helmrepos -> helmrepo.NewHelmRepoCreateHandler
	hrCreateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/helmrepos",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	hrCreateHandler := helmrepo.NewHelmRepoCreateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: hrCreateEndpoint,
		Handler:  hrCreateHandler,
		Router:   r,
	})

	//  GET /api/projects/{project_id}/helmrepos -> helmrepo.NewHelmRepoListHandler
	hrListEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/helmrepos",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	hrListHandler := helmrepo.NewHelmRepoListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: hrListEndpoint,
		Handler:  hrListHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/tags -> project.NewGetTagsHandler
	getTagsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/tags",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getTagsHandler := project.NewGetTagsHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getTagsEndpoint,
		Handler:  getTagsHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/tags -> project.NewCreateTagHandler
	createTagEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/tags",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	createTagHandler := project.NewCreateTagHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createTagEndpoint,
		Handler:  createTagHandler,
		Router:   r,
	})

	return routes, newPath
}
