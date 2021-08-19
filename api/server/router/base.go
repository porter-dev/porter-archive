package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared"
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
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
	routes := make([]*Route, 0)

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

	return routes
}
