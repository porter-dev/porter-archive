package router

import (
	"github.com/go-chi/chi/v5"
	"github.com/porter-dev/porter/api/server/router/middleware"
	"github.com/porter-dev/porter/provisioner/server/authn"
	"github.com/porter-dev/porter/provisioner/server/authz"
	"github.com/porter-dev/porter/provisioner/server/config"
	"github.com/porter-dev/porter/provisioner/server/handlers/credentials"
	"github.com/porter-dev/porter/provisioner/server/handlers/healthcheck"
	"github.com/porter-dev/porter/provisioner/server/handlers/provision"
	"github.com/porter-dev/porter/provisioner/server/handlers/state"
)

func NewAPIRouter(config *config.Config) *chi.Mux {
	r := chi.NewRouter()

	r.Route("/api/v1", func(r chi.Router) {
		// set the content type for all API endpoints and log all request info
		r.Use(middleware.ContentTypeJSON)

		// create new group for raw state endpoints which use workspace authz middleware
		basicAuth := authn.NewAuthNBasicFactory(config)
		staticTokenAuth := authn.NewAuthNStaticFactory(config)
		porterTokenAuth := authn.NewAuthNPorterTokenFactory(config)
		workspaceAuth := authz.NewWorkspaceScopedFactory(config)

		r.Method("GET", "/readyz", healthcheck.NewReadyzHandler(config))
		r.Method("GET", "/livez", healthcheck.NewLivezHandler(config))

		r.Group(func(r chi.Router) {
			// This group is meant to be called via a provisioner pod
			r.Group(func(r chi.Router) {
				r.Use(porterTokenAuth.NewAuthenticated)
				r.Use(workspaceAuth.Middleware)

				r.Method("POST", "/{workspace_id}/resource", state.NewCreateResourceHandler(config))
				r.Method("DELETE", "/{workspace_id}/resource", state.NewDeleteResourceHandler(config))
				r.Method("POST", "/{workspace_id}/error", state.NewReportErrorHandler(config))
				r.Method("GET", "/{workspace_id}/credentials", credentials.NewCredentialsGetHandler(config))
			})

			// This group is meant to be called from Terraform via basic auth
			r.Group(func(r chi.Router) {
				r.Use(basicAuth.NewAuthenticated)
				r.Use(workspaceAuth.Middleware)

				r.Method("GET", "/{workspace_id}/tfstate", state.NewRawStateGetHandler(config))
				r.Method("POST", "/{workspace_id}/tfstate", state.NewRawStateUpdateHandler(config))
			})

			// This group is meant to be called via the API server
			r.Group(func(r chi.Router) {
				r.Use(staticTokenAuth.NewAuthenticated)
				r.Use(workspaceAuth.Middleware)

				// Note that this handler is also used in the above group. The /tfstate/raw endpoint is meant to
				// be used from the API server, while the /tfstate endpoint is meant to be called as a Terraform
				// HTTP backend.
				r.Method("GET", "/{workspace_id}/tfstate/raw", state.NewRawStateGetHandler(config))
				r.Method("GET", "/{workspace_id}/logs", state.NewLogsGetHandler(config))
			})
		})

		// use project and infra-scoped middleware
		projectAuth := authz.NewProjectScopedFactory(config)
		infraAuth := authz.NewInfraScopedFactory(config)

		// This group is meant to be called via the API server
		r.Group(func(r chi.Router) {
			r.Use(staticTokenAuth.NewAuthenticated)
			r.Use(projectAuth.Middleware)
			r.Use(infraAuth.Middleware)

			r.Method("GET", "/projects/{project_id}/infras/{infra_id}/state", state.NewStateGetHandler(config))
			r.Method("POST", "/projects/{project_id}/infras/{infra_id}/apply", provision.NewProvisionApplyHandler(config))
			r.Method("DELETE", "/projects/{project_id}/infras/{infra_id}", provision.NewProvisionDestroyHandler(config))
		})
	})

	return r
}
