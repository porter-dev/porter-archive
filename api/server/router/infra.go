package router

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/database"
	"github.com/porter-dev/porter/api/server/handlers/infra"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewInfraScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetInfraScopedRoutes,
		Children:  children,
	}
}

func GetInfraScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getInfraRoutes(r, config, basePath, factory)

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

func getInfraRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/infras/{infra_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*router.Route, 0)

	// GET /api/projects/{project_id}/infra -> project.NewInfraListHandler
	listInfraEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/infra",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listInfraHandler := infra.NewInfraListHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listInfraEndpoint,
		Handler:  listInfraHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/infras/{infra_id} -> infra.NewInfraGetHandler
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
				types.InfraScope,
			},
		},
	)

	getHandler := infra.NewInfraGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/infras/{infra_id}/retry_create -> infra.NewInfraRetryHandler
	retryCreateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/retry_create",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.InfraScope,
			},
		},
	)

	retryCreateHandler := infra.NewInfraRetryCreateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: retryCreateEndpoint,
		Handler:  retryCreateHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/infras/{infra_id}/update -> infra.NewInfraUpdateHandler
	updateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/update",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.InfraScope,
			},
		},
	)

	updateHandler := infra.NewInfraUpdateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateEndpoint,
		Handler:  updateHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/infras/{infra_id}/retry_delete -> infra.NewInfraRetryDeleteHandler
	retryDeleteEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/retry_delete",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.InfraScope,
			},
		},
	)

	retryDeleteHandler := infra.NewInfraRetryDeleteHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: retryDeleteEndpoint,
		Handler:  retryDeleteHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/infras/{infra_id}/operations -> infra.NewInfraListOperationsHandler
	listOperationsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/operations",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.InfraScope,
			},
		},
	)

	listOperationsHandler := infra.NewInfraListOperationsHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listOperationsEndpoint,
		Handler:  listOperationsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/infras/{infra_id}/operations/{operation_id} -> infra.NewInfraGetOperationHandler
	getOperationEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/operations/{%s}", relPath, types.URLParamOperationID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.InfraScope,
				types.OperationScope,
			},
		},
	)

	getOperationHandler := infra.NewInfraGetOperationHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getOperationEndpoint,
		Handler:  getOperationHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/infras/{infra_id}/operations/{operation_id}/state -> infra.NewInfraStreamStateHandler
	streamStateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/operations/{%s}/state", relPath, types.URLParamOperationID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.InfraScope,
				types.OperationScope,
			},
			IsWebsocket: true,
		},
	)

	streamStateHandler := infra.NewInfraStreamStateHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: streamStateEndpoint,
		Handler:  streamStateHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/infras/{infra_id}/operations/{operation_id}/log_stream -> infra.NewInfraStreamLogHandler
	streamLogEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/operations/{%s}/log_stream", relPath, types.URLParamOperationID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.InfraScope,
				types.OperationScope,
			},
			IsWebsocket: true,
		},
	)

	streamLogHandler := infra.NewInfraStreamLogHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: streamLogEndpoint,
		Handler:  streamLogHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/infras/{infra_id}/operations/{operation_id}/logs -> infra.NewInfraGetOperationLogsHandler
	getOperationLogsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/operations/{%s}/logs", relPath, types.URLParamOperationID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.InfraScope,
				types.OperationScope,
			},
		},
	)

	getOperationLogsHandler := infra.NewInfraGetOperationLogsHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getOperationLogsEndpoint,
		Handler:  getOperationLogsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/infras/{infra_id}/state -> infra.NewInfraGetStateHandler
	getStateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/state",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.InfraScope,
			},
		},
	)

	getStateHandler := infra.NewInfraGetStateHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getStateEndpoint,
		Handler:  getStateHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/infras/{infra_id} -> infra.NewInfraDeleteHandler
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
				types.InfraScope,
			},
		},
	)

	deleteHandler := infra.NewInfraDeleteHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteEndpoint,
		Handler:  deleteHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/infras/{infra_id}/database -> database.NewDatabaseUpdateStatusHandler
	updateDBStatusEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/database",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.InfraScope,
			},
		},
	)

	updateDBStatusHandler := database.NewDatabaseUpdateStatusHandler(
		config,
		factory.GetDecoderValidator(),
	)

	routes = append(routes, &router.Route{
		Endpoint: updateDBStatusEndpoint,
		Handler:  updateDBStatusHandler,
		Router:   r,
	})

	return routes, newPath
}
