package v1

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/stack"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

// swagger:parameters getStack deleteStack putStackSource rollbackStack listStackRevisions addApplication addEnvGroup
type stackPathParams struct {
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

	// The namespace
	// in: path
	// required: true
	Namespace string `json:"namespace"`

	// The stack id
	// in: path
	// required: true
	StackID string `json:"stack_id"`
}

// swagger:parameters getStackRevision
type stackRevisionPathParams struct {
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

	// The namespace
	// in: path
	// required: true
	Namespace string `json:"namespace"`

	// The stack id
	// in: path
	// required: true
	StackID string `json:"stack_id"`

	// The stack revision id
	// in: path
	// required: true
	// minimum: 1
	RevisionID string `json:"revision_id"`
}

// swagger:parameters removeApplication
type stackRemoveApplicationPathParams struct {
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

	// The namespace
	// in: path
	// required: true
	Namespace string `json:"namespace"`

	// The stack id
	// in: path
	// required: true
	StackID string `json:"stack_id"`

	// The name of the application
	// in: path
	// required: true
	AppResourceName string `json:"app_resource_name"`
}

// swagger:parameters removeEnvGroup
type stackRemoveEnvGroupPathParams struct {
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

	// The namespace
	// in: path
	// required: true
	Namespace string `json:"namespace"`

	// The stack id
	// in: path
	// required: true
	StackID string `json:"stack_id"`

	// The name of the environment group
	// in: path
	// required: true
	EnvGroupName string `json:"env_group_name"`
}

func NewV1StackScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetV1StackScopedRoutes,
		Children:  children,
	}
}

func GetV1StackScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getV1StackRoutes(r, config, basePath, factory)

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

func getV1StackRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/stacks"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// POST /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks -> stack.NewStackCreateHandler
	// swagger:operation POST /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks createStack
	//
	// Creates a new stack and triggers a deployment for all resources in the stack.
	//
	// ---
	// produces:
	// - application/json
	// summary: Create a stack
	// tags:
	// - Stacks
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - in: body
	//     name: CreateStackRequest
	//     description: The stack to create
	//     schema:
	//       $ref: '#/definitions/CreateStackRequest'
	// responses:
	//   '201':
	//     description: Successfully created the stack
	//     schema:
	//       $ref: '#/definitions/Stack'
	//   '403':
	//     description: Forbidden
	createEndpoint := factory.NewAPIEndpoint(
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
				types.ClusterScope,
				types.NamespaceScope,
			},
		},
	)

	createHandler := stack.NewStackCreateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createEndpoint,
		Handler:  createHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks -> stack.NewStackListHandler
	// swagger:operation GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks listStacks
	//
	// Lists stacks in a namespace
	//
	// ---
	// produces:
	// - application/json
	// summary: List stacks
	// tags:
	// - Stacks
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	// responses:
	//   '200':
	//     description: Successfully listed stacks
	//     schema:
	//       $ref: '#/definitions/StackListResponse'
	//   '403':
	//     description: Forbidden
	listEndpoint := factory.NewAPIEndpoint(
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

	listHandler := stack.NewStackListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listEndpoint,
		Handler:  listHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id} -> stack.NewStackGetHandler
	// swagger:operation GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id} getStack
	//
	// Gets a stack
	//
	// ---
	// produces:
	// - application/json
	// summary: Get a stack
	// tags:
	// - Stacks
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: stack_id
	// responses:
	//   '200':
	//     description: Successfully got the stack
	//     schema:
	//       $ref: '#/definitions/Stack'
	//   '403':
	//     description: Forbidden
	getEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{stack_id}",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.StackScope,
			},
		},
	)

	getHandler := stack.NewStackGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/revisions -> stack.NewStackListRevisionsHandler
	// swagger:operation GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/revisions listStackRevisions
	//
	// Lists revisions in a stack. A max of 100 revisions will be returned, sorted from most recent to least recent.
	//
	// ---
	// produces:
	// - application/json
	// summary: List stack revisions
	// tags:
	// - Stacks
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: stack_id
	// responses:
	//   '200':
	//     description: Successfully listed stack revisions
	//     schema:
	//       $ref: '#/definitions/ListStackRevisionsResponse'
	//   '403':
	//     description: Forbidden
	listRevisionsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{stack_id}/revisions",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.StackScope,
			},
		},
	)

	listRevisionsHandler := stack.NewStackListRevisionsHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listRevisionsEndpoint,
		Handler:  listRevisionsHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/{revision_id} -> stack.NewStackGetRevisionHandler
	// swagger:operation GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/{revision_id} getStackRevision
	//
	// Gets a stack revision
	//
	// ---
	// produces:
	// - application/json
	// summary: Get a stack revision
	// tags:
	// - Stacks
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: stack_id
	//   - name: revision_id
	// responses:
	//   '200':
	//     description: Successfully got the stack revision
	//     schema:
	//       $ref: '#/definitions/StackRevision'
	//   '403':
	//     description: Forbidden
	getRevisionEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{stack_id}/{stack_revision_number}",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.StackScope,
			},
		},
	)

	getRevisionHandler := stack.NewStackGetRevisionHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getRevisionEndpoint,
		Handler:  getRevisionHandler,
		Router:   r,
	})

	// PUT /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/source -> stack.NewStackPutSourceConfig
	// swagger:operation PUT /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/source putStackSource
	//
	// Updates a stack's source configuration
	//
	// ---
	// produces:
	// - application/json
	// summary: Update source configuration
	// tags:
	// - Stacks
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: stack_id
	//   - in: body
	//     name: PutStackSourceConfigRequest
	//     description: The source configurations to update
	//     schema:
	//       $ref: '#/definitions/PutStackSourceConfigRequest'
	// responses:
	//   '200':
	//     description: Successfully updated the source configuration
	//     schema:
	//       $ref: '#/definitions/Stack'
	//   '403':
	//     description: Forbidden
	putSourceEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPut,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{stack_id}/source",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.StackScope,
			},
		},
	)

	putSourceHandler := stack.NewStackPutSourceConfigHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: putSourceEndpoint,
		Handler:  putSourceHandler,
		Router:   r,
	})

	// POST /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/rollback -> stack.NewStackRollbackHandler
	// swagger:operation POST /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/rollback rollbackStack
	//
	// Performs a rollback for a stack
	//
	// ---
	// produces:
	// - application/json
	// summary: Rollback stack
	// tags:
	// - Stacks
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: stack_id
	//   - in: body
	//     name: StackRollbackRequest
	//     description: The target revision to roll back to
	//     schema:
	//       $ref: '#/definitions/StackRollbackRequest'
	// responses:
	//   '200':
	//     description: Successfully rolled the stack back
	//     schema:
	//       $ref: '#/definitions/Stack'
	//   '403':
	//     description: Forbidden
	rollbackEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{stack_id}/rollback",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.StackScope,
			},
		},
	)

	rollbackHandler := stack.NewStackRollbackHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: rollbackEndpoint,
		Handler:  rollbackHandler,
		Router:   r,
	})

	// DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id} -> stack.NewStackDeleteHandler
	// swagger:operation DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id} deleteStack
	//
	// Deletes a stack
	//
	// ---
	// produces:
	// - application/json
	// summary: Delete a stack
	// tags:
	// - Stacks
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: stack_id
	// responses:
	//   '200':
	//     description: Successfully deleted the stack
	//   '403':
	//     description: Forbidden
	deleteEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{stack_id}",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.StackScope,
			},
		},
	)

	deleteHandler := stack.NewStackDeleteHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteEndpoint,
		Handler:  deleteHandler,
		Router:   r,
	})

	// PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/add_application -> stack.NewStackAddApplicationHandler
	// swagger:operation PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/add_application addApplication
	//
	// Adds an application to an existing stack
	//
	// ---
	// produces:
	// - application/json
	// summary: Add an application to a stack
	// tags:
	// - Stacks
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: stack_id
	//   - in: body
	//     name: AddApplicationToStack
	//     description: The application to add
	//     schema:
	//       $ref: '#/definitions/CreateStackAppResourceRequest'
	// responses:
	//   '200':
	//     description: Successfully added the application to the stack
	//   '400':
	//     description: Stack does not have any revisions
	//   '403':
	//     description: Forbidden
	addApplicationEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPatch,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{stack_id}/add_application",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.StackScope,
			},
		},
	)

	addApplicationHandler := stack.NewStackAddApplicationHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: addApplicationEndpoint,
		Handler:  addApplicationHandler,
		Router:   r,
	})

	// DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/remove_application/{app_resource_name} -> stack.NewStackRemoveApplicationHandler
	// swagger:operation DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/remove_application/{app_resource_name} removeApplication
	//
	// Removes an existing application from a stack
	//
	// ---
	// produces:
	// - application/json
	// summary: Remove an application from a stack
	// tags:
	// - Stacks
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: stack_id
	//   - name: app_resource_name
	// responses:
	//   '200':
	//     description: Successfully deleted the application from the stack
	//   '400':
	//     description: Stack does not have any revisions
	//   '403':
	//     description: Forbidden
	removeApplicationEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{stack_id}/remove_application/{app_resource_name}",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.StackScope,
			},
		},
	)

	removeApplicationHandler := stack.NewStackRemoveApplicationHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: removeApplicationEndpoint,
		Handler:  removeApplicationHandler,
		Router:   r,
	})

	// PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/add_env_group -> stack.NewStackAddEnvGroupHandler
	// swagger:operation PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/add_env_group addEnvGroup
	//
	// Adds an environment group to an existing stack
	//
	// ---
	// produces:
	// - application/json
	// summary: Add an environment group to a stack
	// tags:
	// - Stacks
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: stack_id
	//   - in: body
	//     name: AddEnvGroupToStack
	//     description: The environment group to add
	//     schema:
	//       $ref: '#/definitions/CreateStackEnvGroupRequest'
	// responses:
	//   '200':
	//     description: Successfully added the environment group to the stack
	//   '400':
	//     description: Stack does not have any revisions
	//   '403':
	//     description: Forbidden
	addEnvGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPatch,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{stack_id}/add_env_group",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.StackScope,
			},
		},
	)

	addEnvGroupHandler := stack.NewStackAddEnvGroupHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: addEnvGroupEndpoint,
		Handler:  addEnvGroupHandler,
		Router:   r,
	})

	// DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/remove_env_group/{env_group_name} -> stack.NewStackRemoveEnvGroupHandler
	// swagger:operation DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/stacks/{stack_id}/remove_env_group/{env_group_name} removeEnvGroup
	//
	// Removes an existing environment group from a stack
	//
	// ---
	// produces:
	// - application/json
	// summary: Remove an environment group from a stack
	// tags:
	// - Stacks
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: stack_id
	//   - name: env_group_name
	// responses:
	//   '200':
	//     description: Successfully deleted the environment group from the stack
	//   '400':
	//     description: Stack does not have any revisions
	//   '403':
	//     description: Forbidden
	removeEnvGroupEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{stack_id}/remove_env_group/{env_group_name}",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.StackScope,
			},
		},
	)

	removeEnvGroupHandler := stack.NewStackRemoveEnvGroupHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: removeEnvGroupEndpoint,
		Handler:  removeEnvGroupHandler,
		Router:   r,
	})

	return routes, newPath
}
