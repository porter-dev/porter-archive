package router

import (
	"github.com/go-chi/chi"
	awsClusterInt "github.com/porter-dev/porter/api/server/handlers/cluster_integration/aws"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewClusterIntegrationScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetClusterIntegrationScopedRoutes,
		Children:  children,
	}
}

func GetClusterIntegrationScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getClusterIntegrationRoutes(r, config, basePath, factory)

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

func getClusterIntegrationRoutes(
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

	// GET /api/projects/{project_id}/clusters/{cluster_id}/integrations/aws/info -> awsClusterInt.NewGetClusterInfoHandler
	getAWSClusterInfoEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/aws/info",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getAWSClusterInfoHandler := awsClusterInt.NewGetClusterInfoHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getAWSClusterInfoEndpoint,
		Handler:  getAWSClusterInfoHandler,
		Router:   r,
	})

	return routes, newPath
}
