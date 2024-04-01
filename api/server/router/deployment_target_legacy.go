package router

import (
	"fmt"

	"github.com/go-chi/chi/v5"
	"github.com/porter-dev/porter/api/server/handlers/deployment_target"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

// NewLegacyDeploymentTargetScopedRegisterer applies /api/projects/{project_id}/clusters/{cluster_id}/deployment-targets routes to the gin Router
// Deprecated: use NewDeploymentTargetScopedRegisterer instead
func NewLegacyDeploymentTargetScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetLegacyDeploymentTargetScopedRoutes,
		Children:  children,
	}
}

// GetLegacyDeploymentTargetScopedRoutes returns the router handlers specific to deployment targets
// Deprecated: use GetDeploymentTargetScopedRoutes instead, which are not scoped by cluster
func GetLegacyDeploymentTargetScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getLegacyDeploymentTargetRoutes(r, config, basePath, factory)

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

// getLegacyDeploymentTargetRoutes gets the routes specific to deployment targets
// Deprecated: use getDeploymentTargetRoutes instead, which are not scoped by cluster
func getLegacyDeploymentTargetRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/deployment-targets"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// POST /api/projects/{project_id}/clusters/{cluster_id}/deployment-targets -> deployment_target.CreateDeploymentTargetHandler
	createDeploymentTargetEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createDeploymentTargetHandler := deployment_target.NewCreateDeploymentTargetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createDeploymentTargetEndpoint,
		Handler:  createDeploymentTargetHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/deployment-targets -> deployment_target.ListDeploymentTargetsHandler
	listDeploymentTargetsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listDeploymentTargetsHandler := deployment_target.NewListDeploymentTargetsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listDeploymentTargetsEndpoint,
		Handler:  listDeploymentTargetsHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/clusters/{cluster_id}/deployment-targets/{deployment_target_id} -> deployment_target.DeleteDeploymentTargetHandler
	deleteDeploymentTargetEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamDeploymentTargetID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	deleteDeploymentTargetHandler := deployment_target.NewDeleteDeploymentTargetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteDeploymentTargetEndpoint,
		Handler:  deleteDeploymentTargetHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/deployment-targets/{deployment_target_id} -> deployment_target.GetDeploymentTargetHandler
	getDeploymentTargetEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamDeploymentTargetID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
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
