package router

import (
	"fmt"

	"github.com/go-chi/chi/v5"
	"github.com/porter-dev/porter/api/server/handlers/addons"
	"github.com/porter-dev/porter/api/server/handlers/deployment_target"
	"github.com/porter-dev/porter/api/server/handlers/porter_app"
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

	// GET /api/projects/{project_id}/targets/{deployment_target_identifier}/apps/{porter_app_name}/cloudsql -> porter_app.GetCloudSqlSecretHandler
	getCloudSqlSecretEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/apps/{porter_app_name}/cloudsql", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.DeploymentTargetScope,
			},
		},
	)

	getCloudSqlSecretHandler := porter_app.NewGetCloudSqlSecretHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getCloudSqlSecretEndpoint,
		Handler:  getCloudSqlSecretHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/targets/{deployment_target_identifier}/apps/{porter_app_name}/cloudsql -> porter_app.CreateCloudSqlSecretHandler
	createCloudSqlSecretEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/apps/{porter_app_name}/cloudsql", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.DeploymentTargetScope,
			},
		},
	)

	createCloudSqlSecretHandler := porter_app.NewCreateCloudSqlSecretHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createCloudSqlSecretEndpoint,
		Handler:  createCloudSqlSecretHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/targets/{deployment_target_identifier}/addons -> addons.LatestAddonsHandler
	listAddonsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/addons", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.DeploymentTargetScope,
			},
		},
	)

	listAddonsHandler := addons.NewLatestAddonsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listAddonsEndpoint,
		Handler:  listAddonsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/targets/{deployment_target_identifier}/addons/{addon_name} -> addons.AddonHandler
	addonEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/addons/{%s}", relPath, types.URLParamAddonName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.DeploymentTargetScope,
			},
		},
	)

	addonHandler := addons.NewAddonHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: addonEndpoint,
		Handler:  addonHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/targets/{deployment_target_identifier}/addons/update -> addons.UpdateAddonHandler
	updateAddonEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/addons/update", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.DeploymentTargetScope,
			},
		},
	)

	updateAddonHandler := addons.NewUpdateAddonHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateAddonEndpoint,
		Handler:  updateAddonHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/targets/{deployment_target_identifier}/addons/{addon_name} -> addons.DeleteAddonHandler
	deleteAddonEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/addons/{%s}", relPath, types.URLParamAddonName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.DeploymentTargetScope,
			},
		},
	)

	deleteAddonHandler := addons.NewDeleteAddonHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteAddonEndpoint,
		Handler:  deleteAddonHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/targets/{deployment_target_identifier}/apps/{porter_app_name}/app-event-webhooks -> porter_app.NewAppEventWebhooksHandler
	appEventWebhooks := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/apps/{%s}/app-event-webhooks", relPath, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.DeploymentTargetScope,
			},
		},
	)

	appEventWebhooksHandler := porter_app.NewAppEventWebhooksHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: appEventWebhooks,
		Handler:  appEventWebhooksHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/targets/{deployment_target_identifier}/apps/{porter_app_name}/update-app-event-webhooks-> porter_app.NewUpdateAppEventWebhookHandler
	updateAppEventWebhooks := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/apps/{%s}/update-app-event-webhooks", relPath, types.URLParamPorterAppName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.DeploymentTargetScope,
			},
		},
	)

	updateAppEventWebhooksHandler := porter_app.NewUpdateAppEventWebhookHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateAppEventWebhooks,
		Handler:  updateAppEventWebhooksHandler,
		Router:   r,
	})

	return routes, newPath
}
