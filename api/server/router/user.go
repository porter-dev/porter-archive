package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

func NewUserScopedRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		GetRoutes: GetUserScopedRoutes,
		Children:  children,
	}
}

func GetUserScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
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
) []*Route {
	routes := make([]*Route, 0)

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

	routes = append(routes, &Route{
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

	routes = append(routes, &Route{
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

	routes = append(routes, &Route{
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

	routes = append(routes, &Route{
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

	routes = append(routes, &Route{
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

	routes = append(routes, &Route{
		Endpoint: listEndpoint,
		Handler:  listHandler,
		Router:   r,
	})

	// GET /email/verify/initiate -> user.VerifyEmailInitiateHandler
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

	routes = append(routes, &Route{
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

	emailVerifyFinalizeHandler := user.NewVerifyEmailInitiateHandler(config)

	routes = append(routes, &Route{
		Endpoint: emailVerifyFinalizeEndpoint,
		Handler:  emailVerifyFinalizeHandler,
		Router:   r,
	})

	return routes
}
