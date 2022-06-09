package v1

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/stack"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

// swagger:parameters getStack deleteStack
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
	// Creates a stack
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

	return routes, newPath
}
