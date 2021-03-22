package router

import (
	"net/http"
	"os"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/server/api"
	"github.com/porter-dev/porter/server/requestlog"
	mw "github.com/porter-dev/porter/server/router/middleware"
)

// New creates a new Chi router instance and registers all routes supported by the
// API
func New(a *api.App) *chi.Mux {
	l := a.Logger
	r := chi.NewRouter()

	auth := mw.NewAuth(a.Store, a.ServerConf.CookieName, &token.TokenGeneratorConf{
		TokenSecret: a.ServerConf.TokenGeneratorSecret,
	}, a.Repo)

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
			"GET",
			"/cli/login",
			auth.BasicAuthenticateWithRedirect(
				requestlog.NewHandler(a.HandleCLILoginUser, l),
			),
		)

		r.Method(
			"GET",
			"/cli/login/exchange",
			requestlog.NewHandler(a.HandleCLILoginExchangeToken, l),
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

		r.Method(
			"POST",
			"/email/verify/initiate",
			auth.BasicAuthenticate(
				requestlog.NewHandler(a.InitiateEmailVerifyUser, l),
			),
		)

		r.Method(
			"GET",
			"/email/verify/finalize",
			auth.BasicAuthenticateWithRedirect(
				requestlog.NewHandler(a.FinalizEmailVerifyUser, l),
			),
		)

		r.Method(
			"POST",
			"/password/reset/initiate",
			requestlog.NewHandler(a.InitiatePWResetUser, l),
		)

		r.Method(
			"POST",
			"/password/reset/verify",
			requestlog.NewHandler(a.VerifyPWResetUser, l),
		)

		r.Method(
			"POST",
			"/password/reset/finalize",
			requestlog.NewHandler(a.FinalizPWResetUser, l),
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
			"/oauth/login/github",
			requestlog.NewHandler(a.HandleGithubOAuthStartUser, l),
		)

		r.Method(
			"GET",
			"/oauth/github/callback",
			requestlog.NewHandler(a.HandleGithubOAuthCallback, l),
		)

		r.Method(
			"GET",
			"/oauth/projects/{project_id}/digitalocean",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleDOOAuthStartProject, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/oauth/digitalocean/callback",
			requestlog.NewHandler(a.HandleDOOAuthCallback, l),
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

		// /api/projects/{project_id}/ci routes
		r.Method(
			"POST",
			"/projects/{project_id}/ci/actions",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleCreateGitAction, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		// /api/projects/{project_id}/invites routes
		r.Method(
			"POST",
			"/projects/{project_id}/invites",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleCreateInvite, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/invites",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleListProjectInvites, l),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/invites/{token}",
			auth.BasicAuthenticateWithRedirect(
				requestlog.NewHandler(a.HandleAcceptInvite, l),
			),
		)

		r.Method(
			"DELETE",
			"/projects/{project_id}/invites/{invite_id}",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveInviteAccess(
					requestlog.NewHandler(a.HandleDeleteProjectInvite, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		// /api/projects/{project_id}/infra routes
		r.Method(
			"GET",
			"/projects/{project_id}/infra",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleListProjectInfra, l),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		// /api/projects/{project_id}/provision routes
		r.Method(
			"POST",
			"/projects/{project_id}/provision/test",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleProvisionTestInfra, l),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/provision/ecr",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveAWSIntegrationAccess(
					requestlog.NewHandler(a.HandleProvisionAWSECRInfra, l),
					mw.URLParam,
					mw.BodyParam,
					false,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/provision/eks",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveAWSIntegrationAccess(
					requestlog.NewHandler(a.HandleProvisionAWSEKSInfra, l),
					mw.URLParam,
					mw.BodyParam,
					false,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/provision/gcr",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveGCPIntegrationAccess(
					requestlog.NewHandler(a.HandleProvisionGCPGCRInfra, l),
					mw.URLParam,
					mw.BodyParam,
					false,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/provision/gke",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveGCPIntegrationAccess(
					requestlog.NewHandler(a.HandleProvisionGCPGKEInfra, l),
					mw.URLParam,
					mw.BodyParam,
					false,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/provision/docr",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveDOIntegrationAccess(
					requestlog.NewHandler(a.HandleProvisionDODOCRInfra, l),
					mw.URLParam,
					mw.BodyParam,
					false,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/provision/doks",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveDOIntegrationAccess(
					requestlog.NewHandler(a.HandleProvisionDODOKSInfra, l),
					mw.URLParam,
					mw.BodyParam,
					false,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/provision/{kind}/{infra_id}/logs",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveInfraAccess(
					requestlog.NewHandler(a.HandleGetProvisioningLogs, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/provision/{kind}/{infra_id}/logs",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveInfraAccess(
					requestlog.NewHandler(a.HandleGetProvisioningLogs, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/infra/{infra_id}/ecr/destroy",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveInfraAccess(
					requestlog.NewHandler(a.HandleDestroyAWSECRInfra, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/infra/{infra_id}/test/destroy",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveInfraAccess(
					requestlog.NewHandler(a.HandleDestroyTestInfra, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/infra/{infra_id}/eks/destroy",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveInfraAccess(
					requestlog.NewHandler(a.HandleDestroyAWSEKSInfra, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/infra/{infra_id}/gke/destroy",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveInfraAccess(
					requestlog.NewHandler(a.HandleDestroyGCPGKEInfra, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/infra/{infra_id}/docr/destroy",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveInfraAccess(
					requestlog.NewHandler(a.HandleDestroyDODOCRInfra, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/infra/{infra_id}/doks/destroy",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveInfraAccess(
					requestlog.NewHandler(a.HandleDestroyDODOKSInfra, l),
					mw.URLParam,
					mw.URLParam,
				),
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
				auth.DoesUserHaveAWSIntegrationAccess(
					auth.DoesUserHaveGCPIntegrationAccess(
						requestlog.NewHandler(a.HandleCreateProjectCluster, l),
						mw.URLParam,
						mw.BodyParam,
						true,
					),
					mw.URLParam,
					mw.BodyParam,
					true,
				),
				mw.URLParam,
				mw.WriteAccess,
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

		r.Method(
			"GET",
			"/projects/{project_id}/integrations/oauth",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleListProjectOAuthIntegrations, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		// /api/projects/{project_id}/helmrepos routes
		r.Method(
			"POST",
			"/projects/{project_id}/helmrepos",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveAWSIntegrationAccess(
					auth.DoesUserHaveGCPIntegrationAccess(
						requestlog.NewHandler(a.HandleCreateHelmRepo, l),
						mw.URLParam,
						mw.BodyParam,
						true,
					),
					mw.URLParam,
					mw.BodyParam,
					true,
				),
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
				auth.DoesUserHaveAWSIntegrationAccess(
					auth.DoesUserHaveGCPIntegrationAccess(
						auth.DoesUserHaveDOIntegrationAccess(
							requestlog.NewHandler(a.HandleCreateRegistry, l),
							mw.URLParam,
							mw.BodyParam,
							true,
						),
						mw.URLParam,
						mw.BodyParam,
						true,
					),
					mw.URLParam,
					mw.BodyParam,
					true,
				),
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
			"GET",
			"/projects/{project_id}/registries/ecr/{region}/token",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleGetProjectRegistryECRToken, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/registries/gcr/token",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleGetProjectRegistryGCRToken, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/registries/dockerhub/token",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleGetProjectRegistryDockerhubToken, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/registries/docr/token",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleGetProjectRegistryDOCRToken, l),
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
			"DELETE",
			"/projects/{project_id}/gitrepos/{git_repo_id}",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveGitRepoAccess(
					requestlog.NewHandler(a.HandleDeleteProjectGitRepo, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/gitrepos/{git_repo_id}/repos",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveGitRepoAccess(
					requestlog.NewHandler(a.HandleListRepos, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/gitrepos/{git_repo_id}/repos/{kind}/{owner}/{name}/branches",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveGitRepoAccess(
					requestlog.NewHandler(a.HandleGetBranches, l),
					mw.URLParam,
					mw.URLParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/gitrepos/{git_repo_id}/repos/{kind}/{owner}/{name}/{branch}/contents",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveGitRepoAccess(
					requestlog.NewHandler(a.HandleGetBranchContents, l),
					mw.URLParam,
					mw.URLParam,
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

		// /api/projects/{project_id}/deploy routes
		r.Method(
			"POST",
			"/projects/{project_id}/delete/{name}",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleUninstallTemplate, l),
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
			"/projects/{project_id}/k8s/prometheus/detect",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleDetectPrometheusInstalled, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/k8s/metrics",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleGetPodMetrics, l),
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
			"/projects/{project_id}/k8s/{namespace}/ingress/{name}",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleGetIngress, l),
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

		// /api/projects/{project_id}/subdomain routes
		r.Method(
			"POST",
			"/projects/{project_id}/k8s/subdomain",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveClusterAccess(
					requestlog.NewHandler(a.HandleCreateDNSRecord, l),
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
