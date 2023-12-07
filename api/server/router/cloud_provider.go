package router

import (
	"github.com/go-chi/chi/v5"
	"github.com/porter-dev/porter/api/server/handlers/cloud_provider"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

// NewCloudProviderScopedRegisterer returns a scoped route registerer for CloudProvider routes
func NewCloudProviderScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetCloudProviderScopedRoutes,
		Children:  children,
	}
}

// GetCloudProviderScopedRoutes returns scoped CloudProvider routes with mounted child registerers
func GetCloudProviderScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getCloudProviderRoutes(r, config, basePath, factory)

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

// getCloudProviderRoutes returns CloudProvider routes
func getCloudProviderRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/cloud-providers"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}
	routes := make([]*router.Route, 0)

	// GET /api/projects/{project_id}/cloud-providers/aws -> cloud_provider.NewListAwsHandler
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
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

	getHandler := cloud_provider.NewListAwsHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	return routes, newPath
}
