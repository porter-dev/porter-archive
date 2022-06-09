package router

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/gitinstallation"
	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/handlers/template"
	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewUserScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetUserScopedRoutes,
		Children:  children,
	}
}

func GetUserScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes := getUserRoutes(r, config, basePath, factory)

	for _, child := range children {
		r.Group(func(r chi.Router) {
			childRoutes := child.GetRoutes(r, config, basePath, factory, child.Children...)

			routes = append(routes, childRoutes...)
		})
	}

	return routes
}

func getUserRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) []*router.Route {
	routes := make([]*router.Route, 0)

	// POST /api/welcome -> user.NewUserWelcomeHandler
	welcomeEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/welcome",
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	welcomeHandler := user.NewUserWelcomeHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: welcomeEndpoint,
		Handler:  welcomeHandler,
		Router:   r,
	})

	// GET /api/cli/login -> user.user.NewCLILoginHandler
	cliLoginUserEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/cli/login",
			},
			Scopes:         []types.PermissionScope{types.UserScope},
			ShouldRedirect: true,
		},
	)

	cliLoginUserHandler := user.NewCLILoginHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: cliLoginUserEndpoint,
		Handler:  cliLoginUserHandler,
		Router:   r,
	})

	// POST /api/logout -> user.NewUserLogoutHandler
	logoutUserEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/logout",
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	logoutUserHandler := user.NewUserLogoutHandler(config)

	routes = append(routes, &router.Route{
		Endpoint: logoutUserEndpoint,
		Handler:  logoutUserHandler,
		Router:   r,
	})

	// GET /api/users/current -> user.NewUserGetCurrentHandler
	authCheckEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/users/current",
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	authCheckHandler := user.NewUserGetCurrentHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: authCheckEndpoint,
		Handler:  authCheckHandler,
		Router:   r,
	})

	// DELETE /api/users/current -> user.NewUserDeleteHandler
	deleteUserEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/users/current",
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	deleteUserHandler := user.NewUserDeleteHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteUserEndpoint,
		Handler:  deleteUserHandler,
		Router:   r,
	})

	// POST /api/projects -> project.NewProjectCreateHandler
	createEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/projects",
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	createHandler := project.NewProjectCreateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createEndpoint,
		Handler:  createHandler,
		Router:   r,
	})

	// GET /api/projects -> project.NewProjectListHandler
	listEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/projects",
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	listHandler := project.NewProjectListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listEndpoint,
		Handler:  listHandler,
		Router:   r,
	})

	// POST /email/verify/initiate -> user.VerifyEmailInitiateHandler
	emailVerifyInitiateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/email/verify/initiate",
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	emailVerifyInitiateHandler := user.NewVerifyEmailInitiateHandler(config)

	routes = append(routes, &router.Route{
		Endpoint: emailVerifyInitiateEndpoint,
		Handler:  emailVerifyInitiateHandler,
		Router:   r,
	})

	// GET /email/verify/finalize -> user.VerifyEmailInitiateHandler
	emailVerifyFinalizeEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/email/verify/finalize",
			},
			Scopes:         []types.PermissionScope{types.UserScope},
			ShouldRedirect: true,
		},
	)

	emailVerifyFinalizeHandler := user.NewVerifyEmailFinalizeHandler(
		config,
		factory.GetDecoderValidator(),
	)

	routes = append(routes, &router.Route{
		Endpoint: emailVerifyFinalizeEndpoint,
		Handler:  emailVerifyFinalizeHandler,
		Router:   r,
	})

	// GET /api/templates -> template.NewTemplateListHandler
	listTemplatesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/templates",
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	listTemplatesRequest := template.NewTemplateListHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listTemplatesEndpoint,
		Handler:  listTemplatesRequest,
		Router:   r,
	})

	// GET /api/templates/{name}/{version} -> template.NewTemplateGetHandler
	getTemplateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"/templates/{%s}/{%s}",
					types.URLParamTemplateName,
					types.URLParamTemplateVersion,
				),
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	getTemplateRequest := template.NewTemplateGetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getTemplateEndpoint,
		Handler:  getTemplateRequest,
		Router:   r,
	})

	// GET /api/templates/{name}/{version}/upgrade_notes -> template.NewTemplateGetUpgradeNotesHandler
	getTemplateUpgradeNotesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"/templates/{%s}/{%s}/upgrade_notes",
					types.URLParamTemplateName,
					types.URLParamTemplateVersion,
				),
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	getTemplateUpgradeNotesRequest := template.NewTemplateGetUpgradeNotesHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getTemplateUpgradeNotesEndpoint,
		Handler:  getTemplateUpgradeNotesRequest,
		Router:   r,
	})

	//  GET /api/integrations/github-app/oauth -> gitinstallation.NewGithubAppOAuthStartHandler
	githubAppOAuthStartEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/integrations/github-app/oauth",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
			},
		},
	)

	githubAppOAuthStartHandler := gitinstallation.NewGithubAppOAuthStartHandler(
		config,
	)

	routes = append(routes, &router.Route{
		Endpoint: githubAppOAuthStartEndpoint,
		Handler:  githubAppOAuthStartHandler,
		Router:   r,
	})

	//  GET /api/oauth/github-app/callback -> gitinstallation.GithubAppOAuthCallbackHandler
	githubAppOAuthCallbackEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/oauth/github-app/callback",
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	githubAppOAuthCallbackHandler := gitinstallation.NewGithubAppOAuthCallbackHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: githubAppOAuthCallbackEndpoint,
		Handler:  githubAppOAuthCallbackHandler,
		Router:   r,
	})

	//  GET /api/integrations/github-app/accounts -> gitinstallation.NewGetGithubAppAccountsHandler
	githubAppAccountsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/integrations/github-app/accounts",
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	githubAppAccountsHandler := gitinstallation.NewGetGithubAppAccountsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: githubAppAccountsEndpoint,
		Handler:  githubAppAccountsHandler,
		Router:   r,
	})

	// GET /api/can_create_project -> user.CanCreateProject
	canCreateProjectEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/can_create_project",
			},
			Scopes: []types.PermissionScope{types.UserScope},
		},
	)

	canCreateProjectHandler := user.NewCanCreateProjectHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: canCreateProjectEndpoint,
		Handler:  canCreateProjectHandler,
		Router:   r,
	})

	return routes
}
