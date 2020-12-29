package router

import (
	"net/http"
	"os"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/server/api"
	"github.com/porter-dev/porter/server/requestlog"
	mw "github.com/porter-dev/porter/server/router/middleware"
)

// New creates a new Chi router instance and registers all routes supported by the
// API
func New(a *api.App) *chi.Mux {
	l := a.Logger
	r := chi.NewRouter()

	auth := mw.NewAuth(a.Store, a.ServerConf.CookieName, a.Repo)

	r.Route("/api", func(r chi.Router) {
		r.Use(mw.ContentTypeJSON)

		// health checks
		r.Method("GET", "/livez", http.HandlerFunc(a.HandleLive))
		r.Method("GET", "/readyz", http.HandlerFunc(a.HandleReady))

		// /api/users routes
		r.Method(
			"GET",
			"/users/{user_id}",
			auth.DoesUserIDMatch(
				requestlog.NewHandler(a.HandleReadUser, l),
				mw.URLParam,
			),
		)

		r.Method(
			"GET",
			"/users/{user_id}/projects",
			auth.DoesUserIDMatch(
				requestlog.NewHandler(a.HandleListUserProjects, l),
				mw.URLParam,
			),
		)

		r.Method(
			"POST",
			"/users",
			requestlog.NewHandler(a.HandleCreateUser, l),
		)

		r.Method(
			"DELETE",
			"/users/{user_id}",
			auth.DoesUserIDMatch(
				requestlog.NewHandler(a.HandleDeleteUser, l),
				mw.URLParam,
			),
		)

		r.Method(
			"POST",
			"/login",
			requestlog.NewHandler(a.HandleLoginUser, l),
		)

		r.Method(
			"GET",
			"/auth/check",
			auth.BasicAuthenticate(
				requestlog.NewHandler(a.HandleAuthCheck, l),
			),
		)

		r.Method(
			"POST",
			"/logout",
			auth.BasicAuthenticate(
				requestlog.NewHandler(a.HandleLogoutUser, l),
			),
		)

		// /api/integrations routes
		r.Method(
			"GET",
			"/integrations/cluster",
			auth.BasicAuthenticate(
				requestlog.NewHandler(a.HandleListClusterIntegrations, l),
			),
		)

		r.Method(
			"GET",
			"/integrations/registry",
			auth.BasicAuthenticate(
				requestlog.NewHandler(a.HandleListRegistryIntegrations, l),
			),
		)

		r.Method(
			"GET",
			"/integrations/helm",
			auth.BasicAuthenticate(
				requestlog.NewHandler(a.HandleListHelmRepoIntegrations, l),
			),
		)

		r.Method(
			"GET",
			"/integrations/repo",
			auth.BasicAuthenticate(
				requestlog.NewHandler(a.HandleListRepoIntegrations, l),
			),
		)

		// /api/templates routes
		r.Method(
			"GET",
			"/templates",
			auth.BasicAuthenticate(
				requestlog.NewHandler(a.HandleListTemplates, l),
			),
		)

		r.Method(
			"GET",
			"/templates/{name}/{version}",
			auth.BasicAuthenticate(
				requestlog.NewHandler(a.HandleReadTemplate, l),
			),
		)

		// /api/oauth routes
		r.Method(
			"GET",
			"/oauth/projects/{project_id}/github",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleGithubOAuthStartProject, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/oauth/github/callback",
			requestlog.NewHandler(a.HandleGithubOAuthCallback, l),
		)

		// /api/projects routes
		r.Method(
			"GET",
			"/projects/{project_id}",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleReadProject, l),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects",
			auth.BasicAuthenticate(
				requestlog.NewHandler(a.HandleCreateProject, l),
			),
		)

		r.Method(
			"DELETE",
			"/projects/{project_id}",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleDeleteProject, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		// /api/projects/{project_id}/provision routes

		// TODO -- restrict this endpoint
		r.Method(
			"GET",
			"/projects/{project_id}/provision/test",
			requestlog.NewHandler(a.HandleProvisionTest, l),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/provision/ecr",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleProvisionAWSECRInfra, l),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		// /api/projects/{project_id}/clusters routes
		r.Method(
			"GET",
			"/projects/{project_id}/clusters",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleListProjectClusters, l),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/clusters",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleCreateProjectCluster, l),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/clusters/{cluster_id}",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleReadProjectCluster, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/clusters/{cluster_id}",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleUpdateProjectCluster, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"DELETE",
			"/projects/{project_id}/clusters/{cluster_id}",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleDeleteProjectCluster, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		// /api/projects/{project_id}/clusters/candidates routes
		r.Method(
			"POST",
			"/projects/{project_id}/clusters/candidates",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleCreateProjectClusterCandidates, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/clusters/candidates",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleListProjectClusterCandidates, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/clusters/candidates/{candidate_id}/resolve",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleResolveClusterCandidate, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		// /api/projects/{project_id}/integrations routes
		r.Method(
			"POST",
			"/projects/{project_id}/integrations/gcp",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleCreateGCPIntegration, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/integrations/aws",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleCreateAWSIntegration, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/integrations/basic",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleCreateBasicAuthIntegration, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		// /api/projects/{project_id}/helmrepos routes
		r.Method(
			"POST",
			"/projects/{project_id}/helmrepos",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleCreateHelmRepo, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/helmrepos",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleListProjectHelmRepos, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/helmrepos/{helm_id}/charts",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleListHelmRepoCharts, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		// /api/projects/{project_id}/registries routes
		r.Method(
			"POST",
			"/projects/{project_id}/registries",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleCreateRegistry, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/registries",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleListProjectRegistries, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/registries/{registry_id}",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveRegistryAccess(
					requestlog.NewHandler(a.HandleUpdateProjectRegistry, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"DELETE",
			"/projects/{project_id}/registries/{registry_id}",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveRegistryAccess(
					requestlog.NewHandler(a.HandleDeleteProjectRegistry, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		// /api/projects/{project_id}/registries/{registry_id}/repositories routes
		r.Method(
			"GET",
			"/projects/{project_id}/registries/{registry_id}/repositories",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveRegistryAccess(
					requestlog.NewHandler(a.HandleListRepositories, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			// * is the repo name, which can itself be nested
			// for example, for GCR this is project-id/repo
			// need to use wildcard, see https://github.com/go-chi/chi/issues/243
			"/projects/{project_id}/registries/{registry_id}/repositories/*",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveRegistryAccess(
					requestlog.NewHandler(a.HandleListImages, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		// /api/projects/{project_id}/releases routes
		r.Method(
			"GET",
			"/projects/{project_id}/releases",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleListReleases, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/releases/{name}/{revision}/components",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleGetReleaseComponents, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/releases/{name}/{revision}/controllers",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleGetReleaseControllers, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/releases/{name}/history",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleListReleaseHistory, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/releases/{name}/webhook_token",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleGetReleaseToken, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/releases/{name}/upgrade",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleUpgradeRelease, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/releases/{name}/{revision}",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleGetRelease, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/releases/{name}/rollback",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleRollbackRelease, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		// r.Method(
		// 	"POST",
		// 	"/projects/{project_id}/releases/{name}/upgrade/hook",
		// 	requestlog.NewHandler(a.HandleReleaseDeployHook, l),
		// )

		r.Method(
			"POST",
			"/webhooks/deploy/{token}",
			requestlog.NewHandler(a.HandleReleaseDeployWebhook, l),
		)

		// /api/projects/{project_id}/gitrepos routes
		r.Method(
			"GET",
			"/projects/{project_id}/gitrepos",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleListProjectGitRepos, l),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/gitrepos/{git_repo_id}/repos",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveGitRepoAccess(
					requestlog.NewHandler(a.HandleListRepos, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/gitrepos/{git_repo_id}/repos/{kind}/{name}/branches",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveGitRepoAccess(
					requestlog.NewHandler(a.HandleGetBranches, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/gitrepos/{git_repo_id}/repos/{kind}/{name}/{branch}/contents",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveGitRepoAccess(
					requestlog.NewHandler(a.HandleGetBranchContents, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		// /api/projects/{project_id}/deploy routes
		r.Method(
			"POST",
			"/projects/{project_id}/deploy/{name}/{version}",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleDeployTemplate, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		// /api/projects/{project_id}/k8s routes
		r.Method(
			"GET",
			"/projects/{project_id}/k8s/namespaces",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleListNamespaces, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/k8s/{namespace}/pod/{name}/logs",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleGetPodLogs, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/k8s/{kind}/status",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleStreamControllerStatus, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/k8s/pods",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleListPods, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)
	})

	staticFilePath := a.ServerConf.StaticFilePath

	fs := http.FileServer(http.Dir(staticFilePath))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		if _, err := os.Stat(staticFilePath + r.RequestURI); os.IsNotExist(err) {
			http.StripPrefix(r.URL.Path, fs).ServeHTTP(w, r)
		} else {
			fs.ServeHTTP(w, r)
		}
	})

	return r
}
