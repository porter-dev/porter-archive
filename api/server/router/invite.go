package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/invite"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewInviteScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetInviteScopedRoutes,
		Children:  children,
	}
}

func GetInviteScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getInviteRoutes(r, config, basePath, factory)

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

func getInviteRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/invites/{invite_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*router.Route, 0)

	// GET /api/projects/{project_id}/invites -> invite.NewInvitesListHandler
	listEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/invites",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.SettingsScope,
			},
		},
	)

	listHandler := invite.NewInvitesListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listEndpoint,
		Handler:  listHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/invites -> invite.NewInviteCreateHandler
	createEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/invites",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.SettingsScope,
			},
			CheckUsage:  true,
			UsageMetric: types.Users,
		},
	)

	createHandler := invite.NewInviteCreateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createEndpoint,
		Handler:  createHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/invites/{token} -> invite.NewInviteAcceptHandler
	acceptEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/invites/{token}",
			},
			// only user scope is needed here. adding the project scope will prevent the user
			// from joining the project, since they don't have a role in the project yet.
			Scopes: []types.PermissionScope{
				types.UserScope,
			},
			ShouldRedirect: true,
		},
	)

	acceptHandler := invite.NewInviteAcceptHandler(config)

	routes = append(routes, &router.Route{
		Endpoint: acceptEndpoint,
		Handler:  acceptHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/invites/{invite_id} -> invite.NewInviteUpdateRoleHandler
	updateRoleEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.SettingsScope,
				types.InviteScope,
			},
		},
	)

	updateRoleHandler := invite.NewInviteUpdateRoleHandler(
		config,
		factory.GetDecoderValidator(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateRoleEndpoint,
		Handler:  updateRoleHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/invites/{invite_id} -> invite.NewInviteGetHandler
	deleteEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.SettingsScope,
				types.InviteScope,
			},
		},
	)

	deleteHandler := invite.NewInviteDeleteHandler(
		config,
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteEndpoint,
		Handler:  deleteHandler,
		Router:   r,
	})

	return routes, newPath
}
