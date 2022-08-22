package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/helmrepo"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewHelmRepoScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetHelmRepoScopedRoutes,
		Children:  children,
	}
}

func GetHelmRepoScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getHelmRepoRoutes(r, config, basePath, factory)

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

func getHelmRepoRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/helmrepos/{helm_repo_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*router.Route, 0)

	// GET /api/projects/{project_id}/helmrepos/{helm_repo_id} -> registry.NewHelmRepoGetHandler
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
				types.HelmRepoScope,
			},
		},
	)

	getHandler := helmrepo.NewHelmRepoGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/helmrepos/{helm_repo_id} -> registry.NewHelmRepoDeleteHandler
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
				types.HelmRepoScope,
			},
		},
	)

	deleteHandler := helmrepo.NewHelmRepoDeleteHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteEndpoint,
		Handler:  deleteHandler,
		Router:   r,
	})

	//  GET /api/projects/{project_id}/helmrepos/{helm_repo_id}/charts -> helmrepo.NewChartListHandler
	hrListEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/charts",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.HelmRepoScope,
			},
		},
	)

	hrListHandler := helmrepo.NewChartListHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: hrListEndpoint,
		Handler:  hrListHandler,
		Router:   r,
	})

	//  GET /api/projects/{project_id}/helmrepos/{helm_repo_id}/charts/{name}/{version} -> helmrepo.NewChartGetHandler
	chartGetEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/charts/{name}/{version}",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.HelmRepoScope,
			},
		},
	)

	chartGetHandler := helmrepo.NewChartGetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: chartGetEndpoint,
		Handler:  chartGetHandler,
		Router:   r,
	})

	return routes, newPath
}
