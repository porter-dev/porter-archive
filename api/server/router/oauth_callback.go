package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/oauth_callback"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewOAuthCallbackRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetOAuthCallbackRoutes,
		Children:  children,
	}
}

func GetOAuthCallbackRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	relPath := "/oauth"

	routes := make([]*router.Route, 0)

	// GET /api/oauth/slack/callback -> oauth_callback.NewOAuthCallbackSlackHandler
	slackEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/slack/callback",
			},
		},
	)

	slackHandler := oauth_callback.NewOAuthCallbackSlackHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: slackEndpoint,
		Handler:  slackHandler,
		Router:   r,
	})

	// GET /api/oauth/digitalocean/callback -> oauth_callback.NewOAuthCallbackDOHandler
	doEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/digitalocean/callback",
			},
		},
	)

	doHandler := oauth_callback.NewOAuthCallbackDOHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: doEndpoint,
		Handler:  doHandler,
		Router:   r,
	})

	return routes
}
