package router

import (
	"github.com/go-chi/chi/v5"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

// NewDatastoreScopedRegisterer returns a scoped route registerer for Datastore routes
func NewDatastoreScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetDatastoreScopedRoutes,
		Children:  children,
	}
}

// GetDatastoreScopedRoutes returns scoped Datastore routes with mounted child registerers
func GetDatastoreScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getDatastoreRoutes(r, config, basePath, factory)

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

// getDatastoreRoutes returns Datastore routes
func getDatastoreRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	// empty path as this is mounted onto the datastore endpoints
	relPath := ""

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}
	routes := make([]*router.Route, 0)

	return routes, newPath
}
