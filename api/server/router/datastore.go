package router

import (
	"fmt"

	"github.com/go-chi/chi/v5"
	"github.com/porter-dev/porter/api/server/handlers/datastore"
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

	// GET /api/projects/{project_id}/cloud-providers/{cloud_provider_type}/{cloud_provider_id}/datastores -> cloud_provider.NewListHandler
	listEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/{%s}/datastores", relPath, types.URLParamCloudProviderType, types.URLParamCloudProviderID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listHandler := datastore.NewListDatastoresHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listEndpoint,
		Handler:  listHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/cloud-providers/{cloud_provider_type}/{cloud_provider_id}/datastores/{datastore_type}/{datastore_name} -> cloud_provider.NewListHandler
	getEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/{%s}/datastores/{%s}/{%s}", relPath, types.URLParamCloudProviderType, types.URLParamCloudProviderID, types.URLParamDatastoreType, types.URLParamDatastoreName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getHandler := datastore.NewListDatastoresHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	return routes, newPath
}
