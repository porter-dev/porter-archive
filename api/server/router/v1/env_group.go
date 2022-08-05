package v1

import (
	"fmt"

	"github.com/go-chi/chi"
	v1EnvGroup "github.com/porter-dev/porter/api/server/handlers/v1/env_group"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

// swagger:parameters getEnvGroup
type envGroupVersionPathParams struct {
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

	// The namespace name
	// in: path
	// required: true
	Namespace string `json:"namespace"`

	// The env group name
	// in: path
	// required: true
	Name string `json:"name"`

	// The version of the env group. 0 means latest version.
	// in: path
	// required: true
	// minimum: 0
	Version uint `json:"version"`
}

// swagger:parameters getEnvGroupAllVersions deleteEnvGroup addReleaseToEnvGroup removeReleaseFromEnvGroup
type envGroupPathParams struct {
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

	// The namespace name
	// in: path
	// required: true
	Namespace string `json:"namespace"`

	// The env group name
	// in: path
	// required: true
	Name string `json:"name"`
}

func NewV1EnvGroupScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetV1EnvGroupScopedRoutes,
		Children:  children,
	}
}

func GetV1EnvGroupScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getV1EnvGroupRoutes(r, config, basePath, factory)

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

func getV1EnvGroupRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/env_groups"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// PUT /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups -> namespace.NewCreateEnvGroupHandler
	// swagger:operation PUT /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups createOrUpdateEnvGroup
	//
	// Creates a new env group or updates an existing one in the namespace denoted by `namespace`. The namespace should belong to the cluster
	// denoted by `cluster_id`. The cluster should belong to the project denoted by `project_id`.
	//
	// **Note:** If updating an existing env group, the linked releases with the env group will all be updated as well.
	//
	// ---
	// produces:
	// - application/json
	// summary: Create or update an env group
	// tags:
	// - Env groups
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - in: body
	//     name: CreateEnvGroupRequest
	//     description: The env group to create or update
	//     schema:
	//       $ref: '#/definitions/CreateEnvGroupRequest'
	// responses:
	//   '200':
	//     description: Successfully created a new namespace
	//     schema:
	//       $ref: '#/definitions/V1EnvGroupResponse'
	//   '403':
	//     description: Forbidden
	createOrUpdateEnvGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPut,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	createOrUpdateEnvGroupHandler := v1EnvGroup.NewCreateEnvGroupHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createOrUpdateEnvGroupEndpoint,
		Handler:  createOrUpdateEnvGroupHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name}/versions/{version} -> env_group.NewGetEnvGroupHandler
	// swagger:operation GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name}/versions/{version} getEnvGroup
	//
	// Gets an env group denoted by `name` and `version` in the namespace denoted by `namespace`. The namespace should belong to the cluster denoted by
	// `cluster_id`, which in turn should belong to the project denoted by `project_id`. **Note:** To get the latest version of an env group, set `version` to `0`.
	//
	// ---
	// produces:
	// - application/json
	// summary: Get an env group
	// tags:
	// - Env groups
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: name
	//   - name: version
	// responses:
	//   '200':
	//     description: Successfully fetched the env group
	//     schema:
	//       $ref: '#/definitions/V1EnvGroupResponse'
	//   '403':
	//     description: Forbidden
	//   '404':
	//     description: Env group not found
	getEnvGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/versions/{%s}", relPath, types.URLParamEnvGroupName,
					types.URLParamEnvGroupVersion),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	getEnvGroupHandler := v1EnvGroup.NewGetEnvGroupHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getEnvGroupEndpoint,
		Handler:  getEnvGroupHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name} -> env_group.NewGetEnvGroupAllVersionsHandler
	// swagger:operation GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name} getEnvGroupAllVersions
	//
	// Gets all versions of an env group denoted by `name` in the namespace denoted by `namespace`. The namespace should belong to the cluster denoted by
	// `cluster_id`, which in turn should belong to the project denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: Get all versions of an env group
	// tags:
	// - Env groups
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: name
	// responses:
	//   '200':
	//     description: Successfully fetched the env group
	//     schema:
	//       $ref: '#/definitions/V1EnvGroupsAllVersionsResponse'
	//   '403':
	//     description: Forbidden
	//   '404':
	//     description: Env group not found
	getEnvGroupAllVersionsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamEnvGroupName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	getEnvGroupAllVersionsHandler := v1EnvGroup.NewGetEnvGroupAllVersionsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getEnvGroupAllVersionsEndpoint,
		Handler:  getEnvGroupAllVersionsHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups -> namespace.NewListEnvGroupsHandler
	// swagger:operation GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups listAllEnvGroups
	//
	// Gets all env groups in the namespace denoted by `namespace`. The namespace should belong to the cluster denoted by
	// `cluster_id`, which in turn should belong to the project denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: Get all env groups
	// tags:
	// - Env groups
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	// responses:
	//   '200':
	//     description: Successfully fetched the env group
	//     schema:
	//       $ref: '#/definitions/V1ListAllEnvGroupsResponse'
	//   '403':
	//     description: Forbidden
	listEnvGroupsEndpoint := factory.NewAPIEndpoint(
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
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	listEnvGroupsHandler := v1EnvGroup.NewListEnvGroupsHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listEnvGroupsEndpoint,
		Handler:  listEnvGroupsHandler,
		Router:   r,
	})

	// DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name} -> env_group.NewDeleteEnvGroupHandler
	// swagger:operation DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name} deleteEnvGroup
	//
	// Deletes the env group denoted by `name` in the namespace denoted by `namespace`. The namespace should belong to the cluster denoted by
	// `cluster_id`, which in turn should belong to the project denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: Delete an env group
	// tags:
	// - Env groups
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: name
	// responses:
	//   '200':
	//     description: Successfully deleted the env group
	//   '403':
	//     description: Forbidden
	//   '412':
	//     description: Env group is linked to one or more releases
	deleteEnvGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamEnvGroupName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	deleteEnvGroupHandler := v1EnvGroup.NewDeleteEnvGroupHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteEnvGroupEndpoint,
		Handler:  deleteEnvGroupHandler,
		Router:   r,
	})

	// PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name}/add_release -> env_group.NewAddReleaseToEnvGroupHandler
	// swagger:operation PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name}/add_release addReleaseToEnvGroup
	//
	// Adds a release to the env group denoted by `name` in the namespace denoted by `namespace`. The namespace should belong to the cluster denoted by
	// `cluster_id`, which in turn should belong to the project denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: Add a release to an env group
	// tags:
	// - Env groups
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: name
	//   - in: body
	//     name: V1EnvGroupReleaseRequest
	//     description: The name of the release to add
	//     schema:
	//       $ref: '#/definitions/V1EnvGroupReleaseRequest'
	// responses:
	//   '200':
	//     description: Successfully added the release
	//   '403':
	//     description: Forbidden
	//   '404':
	//     description: Env group not found
	addReleaseToEnvGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPatch,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/add_release", relPath, types.URLParamEnvGroupName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	addReleaseToEnvGroupHandler := v1EnvGroup.NewAddReleaseToEnvGroupHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: addReleaseToEnvGroupEndpoint,
		Handler:  addReleaseToEnvGroupHandler,
		Router:   r,
	})

	// PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name}/remove_release -> env_group.NewRemoveReleaseFromEnvGroupHandler
	// swagger:operation PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/env_groups/{name}/remove_release removeReleaseFromEnvGroup
	//
	// Removes a release from the env group denoted by `name` in the namespace denoted by `namespace`. The namespace should belong to the cluster denoted by
	// `cluster_id`, which in turn should belong to the project denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: Remove a release from an env group
	// tags:
	// - Env groups
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: name
	//   - in: body
	//     name: V1EnvGroupReleaseRequest
	//     description: The name of the release to remove
	//     schema:
	//       $ref: '#/definitions/V1EnvGroupReleaseRequest'
	// responses:
	//   '200':
	//     description: Successfully removed the release
	//   '403':
	//     description: Forbidden
	//   '404':
	//     description: Env group not found
	removeReleaseFromEnvGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPatch,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/remove_release", relPath, types.URLParamEnvGroupName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	removeReleaseFromEnvGroupHandler := v1EnvGroup.NewRemoveReleaseFromEnvGroupHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: removeReleaseFromEnvGroupEndpoint,
		Handler:  removeReleaseFromEnvGroupHandler,
		Router:   r,
	})

	return routes, newPath
}
