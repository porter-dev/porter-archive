package router

import (
	"github.com/go-chi/chi"
	project_integration "github.com/porter-dev/porter/api/server/handlers/project_integrations"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

func NewProjectIntegrationScopedRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		GetRoutes: GetProjectIntegrationScopedRoutes,
		Children:  children,
	}
}

func GetProjectIntegrationScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
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
) ([]*Route, *types.Path) {
	relPath := "/integrations"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*Route, 0)

	// GET /api/projects/{project_id}/integrations/oauth -> project_integrations.NewListOAuth
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

	routes = append(routes, &Route{
		Endpoint: listOAuthEndpoint,
		Handler:  listOAuthHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/integrations/basic -> project_integrations.NewCreateBasicHandler
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

	routes = append(routes, &Route{
		Endpoint: createBasicEndpoint,
		Handler:  createBasicHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/integrations/aws -> project_integrations.NewCreateAWSHandler
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

	routes = append(routes, &Route{
		Endpoint: createAWSEndpoint,
		Handler:  createAWSHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/integrations/aws/overwrite -> project_integrations.NewOverwriteAWSHandler
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

	routes = append(routes, &Route{
		Endpoint: overwriteAWSEndpoint,
		Handler:  overwriteAWSHandler,
		Router:   r,
	})

	return routes, newPath
}
