package router

import (
	"github.com/go-chi/chi/v5"
	"github.com/porter-dev/porter/api/server/handlers/deployment_target"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

// NewDeploymentTargetScopedRegisterer applies /api/projects/{project_id}/targets routes to the gin Router
func NewDeploymentTargetScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetDeploymentTargetScopedRoutes,
		Children:  children,
	}
}

// GetDeploymentTargetScopedRoutes returns the router handlers specific to deployment targets
func GetDeploymentTargetScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getDeploymentTargetRoutes(r, config, basePath, factory)

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

// getDeploymentTargetRoutes gets the routes that use deployment targets as a first class object instead of scoped to clusters
func getDeploymentTargetRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/targets/{deployment_target_identifier}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// GET /api/projects/{project_id}/targets/{deployment_target_identifier} -> deployment_target.GetDeploymentTargetHandler
	getDeploymentTargetEndpoint := factory.NewAPIEndpoint(
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
				types.DeploymentTargetScope,
			},
		},
	)

	getDeploymentTargetHandler := deployment_target.NewGetDeploymentTargetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getDeploymentTargetEndpoint,
		Handler:  getDeploymentTargetHandler,
		Router:   r,
	})

	return routes, newPath
}
