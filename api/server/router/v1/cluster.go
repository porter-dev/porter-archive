package v1

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/cluster"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

// swagger:parameters createNamespace listNamespaces
type clusterPathParams struct {
	// The project id
	// in: path
	// required: true
	// minimum: 1
	ProjectID uint `json:"project_id"`

	// The cluster id
	// in: path
	// required: true
	// minimum: 1
	ClusterID uint `json:"cluster_id"`
}

func NewV1ClusterScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetV1ClusterScopedRoutes,
		Children:  children,
	}
}

func GetV1ClusterScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getV1ClusterRoutes(r, config, basePath, factory)

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

func getV1ClusterRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/clusters/{cluster_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// POST /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces -> cluster.NewCreateNamespaceHandler
	// swagger:operation POST /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces createNamespace
	//
	// Creates a new namespace in the cluster denoted by `cluster_id`. The cluster should belong to the project
	// denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: Create a new namespace
	// tags:
	// - Namespaces
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - in: body
	//     name: CreateNamespaceRequest
	//     description: The namespace to create
	//     schema:
	//       $ref: '#/definitions/CreateNamespaceRequest'
	// responses:
	//   '201':
	//     description: Successfully created a new namespace
	//     schema:
	//       $ref: '#/definitions/NamespaceResponse'
	//   '403':
	//     description: Forbidden
	//   '412':
	//     description: Namespace already exists
	createNamespaceEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/namespaces",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createNamespaceHandler := cluster.NewCreateNamespaceHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createNamespaceEndpoint,
		Handler:  createNamespaceHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace} -> cluster.NewGetNamespaceHandler
	// swagger:operation GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace} getNamespace
	//
	// Gets a namespace denoted by the name `namespace`. The namespace should belong to the cluster
	// denoted by `cluster_id` which itself should belong to the project denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: Get a namespace
	// tags:
	// - Namespaces
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	// responses:
	//   '200':
	//     description: Successfully got the namespace
	//     schema:
	//       $ref: '#/definitions/NamespaceResponse'
	//   '403':
	//     description: Forbidden
	//   '404':
	//     description: Not Found
	getNamespaceEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/namespaces/{%s}", relPath, types.URLParamNamespace),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getNamespaceHandler := cluster.NewGetNamespaceHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getNamespaceEndpoint,
		Handler:  getNamespaceHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces -> cluster.NewListNamespacesHandler
	// swagger:operation GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces listNamespaces
	//
	// Lists all namespaces in the cluster denoted by `cluster_id`. The cluster should belong to
	// the project denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: List all namespaces
	// tags:
	// - Namespaces
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	// responses:
	//   '200':
	//     description: Successfully listed namespaces
	//     schema:
	//       $ref: '#/definitions/ListNamespacesResponse'
	//   '403':
	//     description: Forbidden
	listNamespacesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/namespaces",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listNamespacesHandler := cluster.NewListNamespacesHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listNamespacesEndpoint,
		Handler:  listNamespacesHandler,
		Router:   r,
	})

	// DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace} -> cluster.NewDeleteNamespaceHandler
	// swagger:operation DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace} deleteNamespace
	//
	// Deletes a namespace with the name `namespace`. The namespace should belong to the cluster
	// denoted by `cluster_id` which itself should belong to the project denoted by `project_id`.
	// Note that this endpoint does not indicate if the namespace does not exist.
	//
	// ---
	// produces:
	// - application/json
	// summary: Delete a namespace
	// tags:
	// - Namespaces
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	// responses:
	//   '200':
	//     description: Successfully deleted namespace
	//   '403':
	//     description: Forbidden
	deleteNamespaceEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/namespaces/{%s}", relPath, types.URLParamNamespace),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	deleteNamespaceHandler := cluster.NewDeleteNamespaceHandler(
		config,
		factory.GetDecoderValidator(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteNamespaceEndpoint,
		Handler:  deleteNamespaceHandler,
		Router:   r,
	})

	return routes, newPath
}
