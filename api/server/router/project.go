package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
)

func RegisterProjectScopedRoutes(
	r chi.Router,
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) chi.Router {
	// Create a new "project-scoped" factory which will create a new project-scoped request
	// after authorization. Each subsequent http.Handler can lookup the project in context.
	projFactory := authz.NewProjectScopedFactory(config.Repo.Project(), config)

	// attach middleware to router
	r.Use(projFactory.NewProjectScoped)

	registerProjectEndpoints(r, config, basePath, factory)

	return r
}

func registerProjectEndpoints(
	r chi.Router,
	config *shared.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) {

}
