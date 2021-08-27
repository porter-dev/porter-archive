package router

import (
	"net/http"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

func NewAPIRouter(config *config.Config) *chi.Mux {
	r := chi.NewRouter()

	// set the content type for all API endpoints
	r.Use(ContentTypeJSON)

	endpointFactory := shared.NewAPIObjectEndpointFactory(config)
	baseRegisterer := NewBaseRegisterer()

	releaseRegisterer := NewReleaseScopedRegisterer()
	namespaceRegisterer := NewNamespaceScopedRegisterer(releaseRegisterer)
	clusterRegisterer := NewClusterScopedRegisterer(namespaceRegisterer)
	infraRegisterer := NewInfraScopedRegisterer()
	gitInstallationRegisterer := NewGitInstallationScopedRegisterer()
	registryRegisterer := NewRegistryScopedRegisterer()
	helmRepoRegisterer := NewHelmRepoScopedRegisterer()
	inviteRegisterer := NewInviteScopedRegisterer()
	projRegisterer := NewProjectScopedRegisterer(
		clusterRegisterer,
		registryRegisterer,
		helmRepoRegisterer,
		inviteRegisterer,
		gitInstallationRegisterer,
		infraRegisterer,
	)
	userRegisterer := NewUserScopedRegisterer(projRegisterer)

	r.Route("/api", func(r chi.Router) {
		baseRoutes := baseRegisterer.GetRoutes(
			r,
			config,
			&types.Path{
				RelativePath: "",
			},
			endpointFactory,
		)

		userRoutes := userRegisterer.GetRoutes(
			r,
			config,
			&types.Path{
				RelativePath: "",
			},
			endpointFactory,
			userRegisterer.Children...,
		)

		routes := append(baseRoutes, userRoutes...)

		registerRoutes(config, routes)
	})

	return r
}

type Route struct {
	Endpoint *shared.APIEndpoint
	Handler  http.Handler
	Router   chi.Router
}

type Registerer struct {
	GetRoutes func(
		r chi.Router,
		config *config.Config,
		basePath *types.Path,
		factory shared.APIEndpointFactory,
		children ...*Registerer,
	) []*Route

	Children []*Registerer
}

func registerRoutes(config *config.Config, routes []*Route) {
	// Create a new "user-scoped" factory which will create a new user-scoped request
	// after authentication. Each subsequent http.Handler can lookup the user in context.
	authNFactory := authn.NewAuthNFactory(config)

	// Create a new "project-scoped" factory which will create a new project-scoped request
	// after authorization. Each subsequent http.Handler can lookup the project in context.
	projFactory := authz.NewProjectScopedFactory(config)

	// Create a new "cluster-scoped" factory which will create a new cluster-scoped request
	// after authorization. Each subsequent http.Handler can lookup the cluster in context.
	clusterFactory := authz.NewClusterScopedFactory(config)

	// Create a new "helmrepo-scoped" factory which will create a new helmrepo-scoped request
	// after authorization. Each subsequent http.Handler can lookup the helm repo in context.
	helmRepoFactory := authz.NewHelmRepoScopedFactory(config)

	// Create a new "registry-scoped" factory which will create a new registry-scoped request
	// after authorization. Each subsequent http.Handler can lookup the registry in context.
	registryFactory := authz.NewRegistryScopedFactory(config)

	// Create a new "gitinstallation-scoped" factory which will create a new gitinstallation-scoped request
	// after authorization. Each subsequent http.Handler can lookup the gitinstallation in context.
	gitInstallationFactory := authz.NewGitInstallationScopedFactory(config)

	// Create a new "invite-scoped" factory which will create a new invite-scoped request
	// after authorization. Each subsequent http.Handler can lookup the invite in context.
	inviteFactory := authz.NewInviteScopedFactory(config)

	// Create a new "infra-scoped" factory which will create a new infra-scoped request
	// after authorization. Each subsequent http.Handler can lookup the infra in context.
	infraFactory := authz.NewInfraScopedFactory(config)

	// Create a new "release-scoped" factory which will create a new release-scoped request
	// after authorization. Each subsequent http.Handler can lookup the release in context.
	releaseFactory := authz.NewReleaseScopedFactory(config)

	// Policy doc loader loads the policy documents for a specific project.
	policyDocLoader := policy.NewBasicPolicyDocumentLoader(config.Repo.Project())

	for _, route := range routes {
		atomicGroup := route.Router.Group(nil)

		for _, scope := range route.Endpoint.Metadata.Scopes {
			switch scope {
			case types.UserScope:
				// if the endpoint should redirect when authn fails, attach redirect handler
				if route.Endpoint.Metadata.ShouldRedirect {
					atomicGroup.Use(authNFactory.NewAuthenticatedWithRedirect)
				} else {
					atomicGroup.Use(authNFactory.NewAuthenticated)
				}
			case types.ProjectScope:
				policyFactory := authz.NewPolicyMiddleware(config, *route.Endpoint.Metadata, policyDocLoader)

				atomicGroup.Use(policyFactory.Middleware)
				atomicGroup.Use(projFactory.Middleware)
			case types.ClusterScope:
				atomicGroup.Use(clusterFactory.Middleware)
			case types.HelmRepoScope:
				atomicGroup.Use(helmRepoFactory.Middleware)
			case types.RegistryScope:
				atomicGroup.Use(registryFactory.Middleware)
			case types.InviteScope:
				atomicGroup.Use(inviteFactory.Middleware)
			case types.GitInstallationScope:
				atomicGroup.Use(gitInstallationFactory.Middleware)
			case types.InfraScope:
				atomicGroup.Use(infraFactory.Middleware)
			case types.ReleaseScope:
				atomicGroup.Use(releaseFactory.Middleware)
			}
		}

		atomicGroup.Method(
			string(route.Endpoint.Metadata.Method),
			route.Endpoint.Metadata.Path.RelativePath,
			route.Handler,
		)
	}
}

// ContentTypeJSON sets the content type for requests to application/json
func ContentTypeJSON(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json;charset=utf8")
		next.ServeHTTP(w, r)
	})
}
