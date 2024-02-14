package router

import (
	"fmt"

	"github.com/go-chi/chi/v5"
	"github.com/porter-dev/porter/api/server/handlers/notifications"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

// NewNotificationScopedRegisterer is a registerer for all /notifications routes
func NewNotificationScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetNotificationScopedRoutes,
		Children:  children,
	}
}

// GetNotificationScopedRoutes returns all /notifications routes
func GetNotificationScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getNotificationRoutes(r, config, basePath, factory)

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

func getNotificationRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/notifications"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*router.Route, 0)

	// POST /api/projects/{project_id}/notifications/config/{notification_config_id} -> notifications.NewUpdateNotificationConfigHandler
	updateNotificationConfigEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/config/{%s}", relPath, types.URLParamNotificationConfigID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	updateNotificationConfigHandler := notifications.NewUpdateNotificationConfigHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateNotificationConfigEndpoint,
		Handler:  updateNotificationConfigHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/notifications/config/{notification_config_id} -> notifications.NewNotificationConfigHandler
	getNotificationConfigEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/config/{%s}", relPath, types.URLParamNotificationConfigID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getNotificationConfigHandler := notifications.NewNotificationConfigHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getNotificationConfigEndpoint,
		Handler:  getNotificationConfigHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/notifications/{notification_id} -> notifications.NewNotificationConfigHandler
	notificationEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamNotificationID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	notificationHandler := notifications.NewNotificationHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: notificationEndpoint,
		Handler:  notificationHandler,
		Router:   r,
	})

	return routes, newPath
}
