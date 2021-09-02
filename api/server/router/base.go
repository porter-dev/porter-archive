package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/metadata"
	"github.com/porter-dev/porter/api/server/handlers/release"
	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

func NewBaseRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		GetRoutes: GetBaseRoutes,
		Children:  children,
	}
}

func GetBaseRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
	routes := make([]*Route, 0)

	// GET /api/capabilities -> user.NewUserCreateHandler
	getMetadataEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/metadata",
			},
		},
	)

	getMetadataHandler := metadata.NewMetadataGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getMetadataEndpoint,
		Handler:  getMetadataHandler,
		Router:   r,
	})

	// POST /api/users -> user.NewUserCreateHandler
	createUserEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/users",
			},
		},
	)

	createUserHandler := user.NewUserCreateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createUserEndpoint,
		Handler:  createUserHandler,
		Router:   r,
	})

	// POST /api/login -> user.NewUserLoginHandler
	loginUserEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/login",
			},
		},
	)

	loginUserHandler := user.NewUserLoginHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: loginUserEndpoint,
		Handler:  loginUserHandler,
		Router:   r,
	})

	// POST /api/cli/login/exchange -> user.NewCLILoginExchangeHandler
	cliLoginExchangeEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/cli/login/exchange",
			},
		},
	)

	cliLoginExchangeHandler := user.NewCLILoginExchangeHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: cliLoginExchangeEndpoint,
		Handler:  cliLoginExchangeHandler,
		Router:   r,
	})

	// POST /api/password/reset/initiate -> user.NewUserPasswordInitiateResetHandler
	passwordInitiateResetEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/password/reset/initiate",
			},
		},
	)

	passwordInitiateResetHandler := user.NewUserPasswordInitiateResetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: passwordInitiateResetEndpoint,
		Handler:  passwordInitiateResetHandler,
		Router:   r,
	})

	// POST /api/password/reset/verify -> user.NewUserPasswordVerifyResetHandler
	passwordVerifyResetEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/password/reset/verify",
			},
		},
	)

	passwordVerifyResetHandler := user.NewUserPasswordVerifyResetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: passwordVerifyResetEndpoint,
		Handler:  passwordVerifyResetHandler,
		Router:   r,
	})

	// POST /api/password/reset/finalize -> user.NewUserPasswordFinalizeResetHandler
	passwordFinalizeResetEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/password/reset/finalize",
			},
		},
	)

	passwordFinalizeResetHandler := user.NewUserPasswordFinalizeResetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: passwordFinalizeResetEndpoint,
		Handler:  passwordFinalizeResetHandler,
		Router:   r,
	})

	// POST /api/webhooks/deploy/{token} -> release.NewWebhookHandler
	webhookEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/webhooks/deploy/{token}",
			},
			Scopes: []types.PermissionScope{},
		},
	)

	webhookHandler := release.NewWebhookHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: webhookEndpoint,
		Handler:  webhookHandler,
		Router:   r,
	})

	return routes
}
