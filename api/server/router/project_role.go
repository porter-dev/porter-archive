package router

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/project_role"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewProjectRoleScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetProjectRoleScopedRoutes,
		Children:  children,
	}
}

func GetProjectRoleScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getProjectRoleRoutes(r, config, basePath, factory)

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

func getProjectRoleRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/project_roles"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// POST /api/projects/{project_id}/project_roles -> project_role.NewCreateProjectRoleHandler
	createProjectRoleEndpoint := factory.NewAPIEndpoint(
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
				types.SettingsScope,
			},
		},
	)

	createProjectRoleHandler := project_role.NewCreateProjectRoleHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createProjectRoleEndpoint,
		Handler:  createProjectRoleHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/project_roles/{role_id} -> project_role.NewGetProjectRoleHandler
	getProjectRoleEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamProjectRoleID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.SettingsScope,
			},
		},
	)

	getProjectRoleHandler := project_role.NewGetProjectRoleHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getProjectRoleEndpoint,
		Handler:  getProjectRoleHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/project_roles -> project_role.NewListProjectRolesHandler
	listProjectRolesEndpoint := factory.NewAPIEndpoint(
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
				types.SettingsScope,
			},
		},
	)

	listProjectRolesHandler := project_role.NewListProjectRolesHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listProjectRolesEndpoint,
		Handler:  listProjectRolesHandler,
		Router:   r,
	})

	// PATCH /api/projects/{project_id}/project_roles/{role_id} -> project_role.NewUpdateProjectRoleHandler
	updateProjectRoleEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPatch,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamProjectRoleID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.SettingsScope,
			},
		},
	)

	updateProjectRoleHandler := project_role.NewUpdateProjectRoleHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateProjectRoleEndpoint,
		Handler:  updateProjectRoleHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/project_roles/{role_id} -> project_role.NewDeleteProjectRoleHandler
	deleteProjectRoleEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamProjectRoleID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.SettingsScope,
			},
		},
	)

	deleteProjectRoleHandler := project_role.NewDeleteProjectRoleHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteProjectRoleEndpoint,
		Handler:  deleteProjectRoleHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/project_roles/scope_hierarchy -> project_role.NewGetProjectRoleScopeHierarchyHandler
	getProjectRoleScopeHierarchyEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/scope_hierarchy", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.SettingsScope,
			},
		},
	)

	getProjectRoleScopeHierarchyHandler := project_role.NewGetProjectRoleScopeHierarchyHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getProjectRoleScopeHierarchyEndpoint,
		Handler:  getProjectRoleScopeHierarchyHandler,
		Router:   r,
	})

	return routes, newPath
}
