package router

import (
	"net/http"
	"os"
	"path"
	"strings"

	"github.com/go-chi/chi"
	chiMiddleware "github.com/go-chi/chi/middleware"
	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/router/middleware"
	v1 "github.com/porter-dev/porter/api/server/router/v1"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewAPIRouter(config *config.Config) *chi.Mux {
	r := chi.NewRouter()

	endpointFactory := shared.NewAPIObjectEndpointFactory(config)

	baseRegisterer := NewBaseRegisterer()
	oauthCallbackRegisterer := NewOAuthCallbackRegisterer()

	releaseRegisterer := NewReleaseScopedRegisterer()
	namespaceRegisterer := NewNamespaceScopedRegisterer(releaseRegisterer)
	clusterIntegrationRegisterer := NewClusterIntegrationScopedRegisterer()
	clusterRegisterer := NewClusterScopedRegisterer(namespaceRegisterer, clusterIntegrationRegisterer)
	infraRegisterer := NewInfraScopedRegisterer()
	gitInstallationRegisterer := NewGitInstallationScopedRegisterer()
	registryRegisterer := NewRegistryScopedRegisterer()
	helmRepoRegisterer := NewHelmRepoScopedRegisterer()
	inviteRegisterer := NewInviteScopedRegisterer()
	projectIntegrationRegisterer := NewProjectIntegrationScopedRegisterer()
	projectOAuthRegisterer := NewProjectOAuthScopedRegisterer()
	slackIntegrationRegisterer := NewSlackIntegrationScopedRegisterer()
	projRegisterer := NewProjectScopedRegisterer(
		clusterRegisterer,
		registryRegisterer,
		helmRepoRegisterer,
		inviteRegisterer,
		gitInstallationRegisterer,
		infraRegisterer,
		projectIntegrationRegisterer,
		projectOAuthRegisterer,
		slackIntegrationRegisterer,
	)
	statusRegisterer := NewStatusScopedRegisterer()

	userRegisterer := NewUserScopedRegisterer(projRegisterer, statusRegisterer)
	panicMW := middleware.NewPanicMiddleware(config)

	if config.ServerConf.PprofEnabled {
		r.Mount("/debug", chiMiddleware.Profiler())
	}

	r.Route("/api", func(r chi.Router) {
		// set panic middleware for all API endpoints to catch panics
		r.Use(panicMW.Middleware)

		// set the content type for all API endpoints and log all request info
		r.Use(middleware.ContentTypeJSON)

		baseRoutes := baseRegisterer.GetRoutes(
			r,
			config,
			&types.Path{
				RelativePath: "",
			},
			endpointFactory,
		)

		oauthCallbackRoutes := oauthCallbackRegisterer.GetRoutes(
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

		routes := [][]*router.Route{
			baseRoutes,
			userRoutes,
			oauthCallbackRoutes,
		}

		var allRoutes []*router.Route
		for _, r := range routes {
			allRoutes = append(allRoutes, r...)
		}

		registerRoutes(config, allRoutes)
	})

	r.Route("/api/v1", func(r chi.Router) {
		// set panic middleware for all API endpoints to catch panics
		r.Use(panicMW.Middleware)

		// set the content type for all API endpoints and log all request info
		r.Use(middleware.ContentTypeJSON)

		var allRoutes []*router.Route

		v1RegistryRegisterer := v1.NewV1RegistryScopedRegisterer()
		v1ReleaseRegisterer := v1.NewV1ReleaseScopedRegisterer()
		v1StackRegisterer := v1.NewV1StackScopedRegisterer()
		v1NamespaceRegisterer := v1.NewV1NamespaceScopedRegisterer(v1ReleaseRegisterer, v1StackRegisterer)
		v1ClusterRegisterer := v1.NewV1ClusterScopedRegisterer(v1NamespaceRegisterer)
		v1ProjRegisterer := v1.NewV1ProjectScopedRegisterer(
			v1ClusterRegisterer,
			v1RegistryRegisterer,
		)

		v1Routes := v1ProjRegisterer.GetRoutes(
			r,
			config,
			&types.Path{
				RelativePath: "",
			},
			endpointFactory,
			v1ProjRegisterer.Children...,
		)

		allRoutes = append(allRoutes, v1Routes...)

		registerRoutes(config, allRoutes)
	})

	staticFilePath := config.ServerConf.StaticFilePath
	fs := http.FileServer(http.Dir(staticFilePath))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Frame-Options", "DENY")

		if _, err := os.Stat(staticFilePath + r.RequestURI); os.IsNotExist(err) {
			w.Header().Set("Cache-Control", "no-cache")

			http.StripPrefix(r.URL.Path, fs).ServeHTTP(w, r)
		} else {
			// Set static files involving html, js, or empty cache to "no-cache", which means they must be validated
			// for changes before the browser uses the cache
			if base := path.Base(r.URL.Path); strings.Contains(base, "html") || strings.Contains(base, "js") || base == "." || base == "/" {
				w.Header().Set("Cache-Control", "no-cache")
			}

			fs.ServeHTTP(w, r)
		}
	})

	return r
}

func registerRoutes(config *config.Config, routes []*router.Route) {
	// Create a new "user-scoped" factory which will create a new user-scoped request
	// after authentication. Each subsequent http.Handler can lookup the user in context.
	authNFactory := authn.NewAuthNFactory(config)

	// Create a new "project-scoped" factory which will create a new project-scoped request
	// after authorization. Each subsequent http.Handler can lookup the project in context.
	projFactory := authz.NewProjectScopedFactory(config)

	// Create a new "cluster-scoped" factory which will create a new cluster-scoped request
	// after authorization. Each subsequent http.Handler can lookup the cluster in context.
	clusterFactory := authz.NewClusterScopedFactory(config)

	// Create a new "namespace-scoped" factory which will create a new namespace-scoped request
	// after authorization. Each subsequent http.Handler can lookup the namespace in context.
	namespaceFactory := authz.NewNamespaceScopedFactory(config)

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

	// Create a new "operation-scoped" factory which will create a new operation-scoped request
	// after authorization. Each subsequent http.Handler can lookup the operation in context.
	operationFactory := authz.NewOperationScopedFactory(config)

	// Create a new "release-scoped" factory which will create a new release-scoped request
	// after authorization. Each subsequent http.Handler can lookup the release in context.
	releaseFactory := authz.NewReleaseScopedFactory(config)

	// Create a new "stack-scoped" factory which will create a new stack-scoped request after
	// authorization. Each subsequent http.Handler can lookup the stack in context.
	stackFactory := authz.NewStackScopedFactory(config)

	// Policy doc loader loads the policy documents for a specific project.
	policyDocLoader := policy.NewBasicPolicyDocumentLoader(config.Repo.Project(), config.Repo.Policy())

	// set up logging middleware to log information about the request
	loggerMw := middleware.NewRequestLoggerMiddleware(config.Logger)

	// websocket middleware for upgrading requests
	websocketMw := middleware.NewWebsocketMiddleware(config)

	// gitlab integration middleware to handle gitlab integrations for a specific project
	gitlabIntFactory := authz.NewGitlabIntegrationScopedFactory(config)

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
			case types.NamespaceScope:
				atomicGroup.Use(namespaceFactory.Middleware)
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
			case types.OperationScope:
				atomicGroup.Use(operationFactory.Middleware)
			case types.ReleaseScope:
				atomicGroup.Use(releaseFactory.Middleware)
			case types.StackScope:
				atomicGroup.Use(stackFactory.Middleware)
			case types.GitlabIntegrationScope:
				atomicGroup.Use(gitlabIntFactory.Middleware)
			}
		}

		if !route.Endpoint.Metadata.Quiet {
			atomicGroup.Use(loggerMw.Middleware)
		}

		if route.Endpoint.Metadata.IsWebsocket {
			atomicGroup.Use(websocketMw.Middleware)
		}

		if route.Endpoint.Metadata.CheckUsage && config.ServerConf.UsageTrackingEnabled {
			usageMW := middleware.NewUsageMiddleware(config, route.Endpoint.Metadata.UsageMetric)

			atomicGroup.Use(usageMW.Middleware)
		}

		atomicGroup.Method(
			string(route.Endpoint.Metadata.Method),
			route.Endpoint.Metadata.Path.RelativePath,
			route.Handler,
		)
	}
}
