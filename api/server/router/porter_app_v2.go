package router

import (
	"github.com/go-chi/chi/v5"
	"github.com/porter-dev/porter/api/server/handlers/porter_app_v2"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewPorterAppV2ScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetPorterAppV2ScopedRoutes,
		Children:  children,
	}
}

func GetPorterAppV2ScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getPorterAppV2Routes(r, config, basePath, factory)

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

func getPorterAppV2Routes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/appv2"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// GET /api/projects/{project_id}/clusters/{cluster_id}/appv2/parse -> porter_app_v2_v2.NewParsePorterYAMLToProtoHandler
	getPorterAppV2Endpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/parse",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	parsePorterYAMLToProtoHandler := porter_app_v2.NewParsePorterYAMLToProtoHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getPorterAppV2Endpoint,
		Handler:  parsePorterYAMLToProtoHandler,
		Router:   r,
	})

	return routes, newPath
}
