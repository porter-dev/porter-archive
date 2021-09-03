package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/invite"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

func NewInviteScopedRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		GetRoutes: GetInviteScopedRoutes,
		Children:  children,
	}
}

func GetInviteScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
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
) ([]*Route, *types.Path) {
	relPath := "/invites/{invite_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*Route, 0)

	// GET /api/projects/{project_id}/invites/{invite_id} -> invite.NewInviteGetHandler
	getEndpoint := factory.NewAPIEndpoint(
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
				types.InviteScope,
			},
		},
	)

	getHandler := invite.NewInviteGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
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
				types.InviteScope,
			},
		},
	)

	updateRoleHandler := invite.NewInviteUpdateRoleHandler(
		config,
		factory.GetDecoderValidator(),
	)

	routes = append(routes, &Route{
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
				types.InviteScope,
			},
		},
	)

	deleteHandler := invite.NewInviteDeleteHandler(
		config,
	)

	routes = append(routes, &Route{
		Endpoint: deleteEndpoint,
		Handler:  deleteHandler,
		Router:   r,
	})

	return routes, newPath
}
