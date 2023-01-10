package v1

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"

	v1Template "github.com/porter-dev/porter/api/server/handlers/v1/template"
)

// swagger:parameters createRegistry listRegistries listTemplates
type projectPathParams struct {
	// The project id
	// in: path
	// required: true
	// minimum: 1
	ProjectID uint `json:"project_id"`
}

// swagger:parameters getTemplate getTemplateUpgradeNotes
type getTemplatePathParams struct {
	// The project id
	// in: path
	// required: true
	// minimum: 1
	ProjectID uint `json:"project_id"`

	// The name of the template
	// in: path
	// required: true
	// type: string
	Name string `json:"name"`

	// The version of the template
	// in: path
	// required: true
	// type: string
	Version string `json:"version"`
}

func NewV1ProjectScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetV1ProjectScopedRoutes,
		Children:  children,
	}
}

func GetV1ProjectScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getV1ProjectRoutes(r, config, basePath, factory)

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

func getV1ProjectRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/projects/{project_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// GET /api/v1/projects/{project_id}/templates -> v1Template.NewTemplateListHandler
	// swagger:operation GET /api/v1/projects/{project_id}/templates listTemplates
	//
	// Lists templates for a given `repo_url`.
	//
	// ---
	// produces:
	// - application/json
	// summary: List templates
	// tags:
	// - Templates
	// parameters:
	//   - name: project_id
	//   - name: repo_url
	//     in: query
	//     description: |
	//       The full path (including scheme) of the Helm registry to list templates from.
	//     type: string
	// responses:
	//   '200':
	//     description: Successfully listed templates
	//     schema:
	//       $ref: '#/definitions/ListTemplatesResponse'
	//   '400':
	//     description: A malformed or bad request
	//   '403':
	//     description: Forbidden
	listTemplatesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/templates", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listTemplatesRequest := v1Template.NewTemplateListHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listTemplatesEndpoint,
		Handler:  listTemplatesRequest,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/templates/{name}/versions/{version} -> v1Template.NewTemplateGetHandler
	// swagger:operation GET /api/v1/projects/{project_id}/templates/{name}/versions/{version} getTemplate
	//
	// Retrieves a given template by a `name` and a `version`
	//
	// ---
	// produces:
	// - application/json
	// summary: Get template
	// tags:
	// - Templates
	// parameters:
	//   - name: project_id
	//   - name: name
	//   - name: version
	//   - name: repo_url
	//     in: query
	//     description: |
	//       The full path (including scheme) of the Helm registry to list templates from.
	//     type: string
	// responses:
	//   '200':
	//     description: Successfully got the template
	//     schema:
	//       $ref: '#/definitions/GetTemplateResponse'
	//   '400':
	//     description: A malformed or bad request
	//   '403':
	//     description: Forbidden
	getTemplateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"%s/templates/{%s}/versions/{%s}",
					relPath,
					types.URLParamTemplateName,
					types.URLParamTemplateVersion,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getTemplateRequest := v1Template.NewTemplateGetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getTemplateEndpoint,
		Handler:  getTemplateRequest,
		Router:   r,
	})

	// GET /api/v1/projects/{project_id}/templates/{name}/versions/{version}/upgrade_notes -> v1Template.NewTemplateGetUpgradeNotesHandler
	// swagger:operation GET /api/v1/projects/{project_id}/templates/{name}/versions/{version}/upgrade_notes getTemplateUpgradeNotes
	//
	// Retrieves a given template by a `name` and a `version`
	//
	// ---
	// produces:
	// - application/json
	// summary: Get template upgrade notes
	// tags:
	// - Templates
	// parameters:
	//   - name: project_id
	//   - name: name
	//   - name: version
	//   - name: prev_version
	//     in: query
	//     description: |
	//       The previous version of the templates to generate upgrade notes from.
	//     type: string
	//   - name: repo_url
	//     in: query
	//     description: |
	//       The full path (including scheme) of the Helm registry to list templates from.
	//     type: string
	// responses:
	//   '200':
	//     description: Successfully got the upgrade notes
	//     schema:
	//       $ref: '#/definitions/GetTemplateUpgradeNotesResponse'
	//   '400':
	//     description: A malformed or bad request
	//   '403':
	//     description: Forbidden
	getTemplateUpgradeNotesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"/templates/{%s}/versions/{%s}/upgrade_notes",
					types.URLParamTemplateName,
					types.URLParamTemplateVersion,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	getTemplateUpgradeNotesRequest := v1Template.NewTemplateGetUpgradeNotesHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getTemplateUpgradeNotesEndpoint,
		Handler:  getTemplateUpgradeNotesRequest,
		Router:   r,
	})

	return routes, newPath
}
