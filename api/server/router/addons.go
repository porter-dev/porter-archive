package router

import (
	"fmt"

	"github.com/go-chi/chi/v5"
	"github.com/porter-dev/porter/api/server/handlers/addons"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

// NewAddonScopedRegisterer returns the router for addon-scoped requests
func NewAddonScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetAddonScopedRoutes,
		Children:  children,
	}
}

// GetAddonScopedRoutes returns the router for addon-scoped requests
func GetAddonScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getAddonRoutes(r, config, basePath, factory)

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

func getAddonRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/addons"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// GET /api/projects/{project_id}/clusters/{cluster_id}/addons/latest -> addons.LatestAddonsHandler
	latestAddonsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/latest", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	latestAddonsHandler := addons.NewLatestAddonsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: latestAddonsEndpoint,
		Handler:  latestAddonsHandler,
		Router:   r,
	})

	return routes, newPath
}
