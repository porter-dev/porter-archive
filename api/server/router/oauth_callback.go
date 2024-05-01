package router

import (
	"github.com/go-chi/chi/v5"
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

	// GET /api/oauth/upstash/callback -> oauth_callback.NewOAuthCallbackUpstashHandler
	upstashEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/upstash/callback",
			},
		},
	)

	upstashHandler := oauth_callback.NewOAuthCallbackUpstashHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: upstashEndpoint,
		Handler:  upstashHandler,
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

	// GET /api/oauth/gitlab/callback -> oauth_callback.NewOAuthCallbackGitlabHandler
	gitlabEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/gitlab/callback",
			},
		},
	)

	gitlabHandler := oauth_callback.NewOAuthCallbackGitlabHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: gitlabEndpoint,
		Handler:  gitlabHandler,
		Router:   r,
	})

	return routes
}
