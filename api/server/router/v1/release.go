package v1

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/namespace"
	"github.com/porter-dev/porter/api/server/handlers/release"
	v1Release "github.com/porter-dev/porter/api/server/handlers/v1/release"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

// swagger:parameters getRelease updateRelease deleteRelease
type releasePathParams struct {
	// The project id
	// in: path
	// required: true
	// minimum: 1
	ProjectID uint `json:"project_id"`

	// The registry id
	// in: path
	// required: true
	// minimum: 1
	RegistryID uint `json:"registry_id"`

	// The namespace name
	// in: path
	// required: true
	Namespace string `json:"namespace"`

	// The release name
	// in: path
	// required: true
	Name string `json:"name"`

	// The release version (`0` for latest version)
	// in: path
	// required: true
	// minimum: 0
	Version uint `json:"version"`
}

// swagger:parameters listReleases
type listReleasesRequest struct {
	*namespacePathParams
	*types.ListReleasesRequest
}

func NewV1ReleaseScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetV1ReleaseScopedRoutes,
		Children:  children,
	}
}

func GetV1ReleaseScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getV1ReleaseRoutes(r, config, basePath, factory)

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

func getV1ReleaseRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/releases"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// POST /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases -> release.NewCreateReleaseHandler
	// swagger:operation POST /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases createRelease
	//
	// Creates a new release in the namespace denoted by `namespace`. The namespace should belong to the
	// cluster denoted by `cluster_id` which itself should belong to the project denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: Create a new release
	// tags:
	// - Releases
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - in: body
	//     name: CreateReleaseRequest
	//     description: The release to create
	//     schema:
	//       $ref: '#/definitions/CreateReleaseRequest'
	// responses:
	//   '201':
	//     description: Successfully created the release
	//   '400':
	//     description: A malformed or bad request
	//   '403':
	//     description: Forbidden
	//   '404':
	//     description: A subresource was not found
	//   '409':
	//     description: A conflict occurred with another external service
	//   '412':
	//     description: A precondition failed for the request
	createReleaseEndpoint := factory.NewAPIEndpoint(
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

	createReleaseHandler := release.NewCreateReleaseHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createReleaseEndpoint,
		Handler:  createReleaseHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version} -> release.NewReleaseGetHandler
	// swagger:operation GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version} getRelease
	//
	// Gets the release denoted by the name `name` and its version `version`. The release should belong to the namespace
	// denoted by `namespace` which itself should belong to the cluster denoted by `cluster_id` and project
	// denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: Get a release
	// tags:
	// - Releases
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: name
	//   - name: version
	// responses:
	//   '200':
	//     description: Successfully got the release
	//     schema:
	//       $ref: '#/definitions/GetReleaseResponse'
	//   '403':
	//     description: Forbidden
	getEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{name}/{version}",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.ReleaseScope,
			},
		},
	)

	getHandler := release.NewReleaseGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases -> namespace.NewListReleasesHandler
	// swagger:operation GET /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases listReleases
	//
	// List all releases in the namespace denoted by `namespace`. The namespace should belong to the cluster
	// denoted by `cluster_id` and project denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: List releases
	// tags:
	// - Releases
	// responses:
	//   '201':
	//     description: Successfully listed releases
	//     schema:
	//       $ref: '#/definitions/ListReleasesResponse'
	//   '403':
	//     description: Forbidden
	listReleasesEndpoint := factory.NewAPIEndpoint(
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

	listReleasesHandler := namespace.NewListReleasesHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listReleasesEndpoint,
		Handler:  listReleasesHandler,
		Router:   r,
	})

	// PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version} ->
	// release.NewUpgradeReleaseHandler
	// swagger:operation PATCH /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version} updateRelease
	//
	// Upgrades the release with the name denoted by `name` and version denoted by `version`. The release should belong
	// to the namespace denoted by `namespace` which itself should belong to the cluster denoted by `cluster_id` and project
	// denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: Update a release
	// tags:
	// - Releases
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: name
	//   - name: version
	//   - in: body
	//     name: UpdateReleaseRequest
	//     description: The release to update
	//     schema:
	//       $ref: '#/definitions/UpdateReleaseRequest'
	// responses:
	//   '200':
	//     description: Successfully updated the release
	//   '400':
	//     description: A malformed or bad request
	//   '403':
	//     description: Forbidden
	upgradeEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPatch,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{name}/{version}",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
				types.NamespaceScope,
				types.ReleaseScope,
			},
		},
	)

	upgradeHandler := v1Release.NewUpgradeReleaseHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: upgradeEndpoint,
		Handler:  upgradeHandler,
		Router:   r,
	})

	// DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version} ->
	// release.NewDeleteReleaseHandler
	// swagger:operation DELETE /api/v1/projects/{project_id}/clusters/{cluster_id}/namespaces/{namespace}/releases/{name}/{version} deleteRelease
	//
	// Deletes the release with the name denoted by `name` and version denoted by `version`. The release should belong
	// to the namespace denoted by `namespace` which itself should belong to the cluster denoted by `cluster_id` and project
	// denoted by `project_id`.
	//
	// ---
	// produces:
	// - application/json
	// summary: Delete a release
	// tags:
	// - Releases
	// parameters:
	//   - name: project_id
	//   - name: cluster_id
	//   - name: namespace
	//   - name: name
	//   - name: version
	// responses:
	//   '200':
	//     description: Successfully deleted the release
	//   '403':
	//     description: Forbidden
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
				types.ClusterScope,
				types.NamespaceScope,
				types.ReleaseScope,
			},
		},
	)

	deleteHandler := release.NewDeleteReleaseHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deleteEndpoint,
		Handler:  deleteHandler,
		Router:   r,
	})

	return routes, newPath
}
