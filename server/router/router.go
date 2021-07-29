package router

import (
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/server/api"
	mw "github.com/porter-dev/porter/server/middleware"
	"github.com/porter-dev/porter/server/middleware/requestlog"
	"golang.org/x/oauth2"
)

// New creates a new Chi router instance and registers all routes supported by the
// API
func New(a *api.App) *chi.Mux {
	l := a.Logger
	r := chi.NewRouter()

	var ghAppConf *oauth2.Config

	if a.GithubAppConf != nil {
		ghAppConf = &a.GithubAppConf.Config
	}

	auth := mw.NewAuth(a.Store, a.ServerConf.CookieName, &token.TokenGeneratorConf{
		TokenSecret: a.ServerConf.TokenGeneratorSecret,
	}, a.Repo, ghAppConf)

	r.Route("/api", func(r chi.Router) {
		r.Use(mw.ContentTypeJSON)

		// Group for default operations with 10s timeout
		r.Group(func(r chi.Router) {
			r.Use(middleware.Timeout(10 * time.Second))

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

			// only allow basic create user or basic login if BasicLogin feature is set
			if a.Capabilities.BasicLogin {
				r.Method(
					"POST",
					"/users",
					requestlog.NewHandler(a.HandleCreateUser, l),
				)

				r.Method(
					"POST",
					"/login",
					requestlog.NewHandler(a.HandleLoginUser, l),
				)
			}

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

			r.Method(
				"POST",
				"/integrations/github-app/webhook",
				requestlog.NewHandler(a.HandleGithubAppEvent, l),
			)

			r.Method(
				"GET",
				"/integrations/github-app/authorize",
				requestlog.NewHandler(a.HandleGithubAppAuthorize, l),
			)

			r.Method(
				"GET",
				"/integrations/github-app/oauth",
				requestlog.NewHandler(a.HandleGithubAppOauthInit, l),
			)

			r.Method(
				"GET",
				"/integrations/github-app/install",
				requestlog.NewHandler(a.HandleGithubAppInstall, l),
			)

			r.Method(
				"GET",
				"/integrations/github-app/access",
				auth.BasicAuthenticate(
					requestlog.NewHandler(a.HandleListGithubAppAccess, l),
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
				"/oauth/github-app/callback",
				requestlog.NewHandler(a.HandleGithubAppOAuthCallback, l),
			)

			r.Method(
				"GET",
				"/oauth/login/google",
				requestlog.NewHandler(a.HandleGoogleStartUser, l),
			)

			r.Method(
				"GET",
				"/oauth/google/callback",
				requestlog.NewHandler(a.HandleGoogleOAuthCallback, l),
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

			r.Method(
				"GET",
				"/oauth/projects/{project_id}/slack",
				auth.DoesUserHaveProjectAccess(
					requestlog.NewHandler(a.HandleSlackOAuthStartProject, l),
					mw.URLParam,
					mw.WriteAccess,
				),
			)

			r.Method(
				"GET",
				"/oauth/slack/callback",
				requestlog.NewHandler(a.HandleSlackOAuthCallback, l),
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
				"GET",
				"/projects/{project_id}/policy",
				auth.DoesUserHaveProjectAccess(
					requestlog.NewHandler(a.HandleReadProjectPolicy, l),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/roles",
				auth.DoesUserHaveProjectAccess(
					requestlog.NewHandler(a.HandleGetProjectRoles, l),
					mw.URLParam,
					mw.AdminAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/collaborators",
				auth.DoesUserHaveProjectAccess(
					requestlog.NewHandler(a.HandleListProjectCollaborators, l),
					mw.URLParam,
					mw.AdminAccess,
				),
			)

			r.Method(
				"POST",
				"/projects/{project_id}/roles/{user_id}",
				auth.DoesUserHaveProjectAccess(
					requestlog.NewHandler(a.HandleUpdateProjectRole, l),
					mw.URLParam,
					mw.AdminAccess,
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
					mw.AdminAccess,
				),
			)

			r.Method(
				"DELETE",
				"/projects/{project_id}/roles/{user_id}",
				auth.DoesUserHaveProjectAccess(
					requestlog.NewHandler(a.HandleDeleteProjectRole, l),
					mw.URLParam,
					mw.AdminAccess,
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
					mw.WriteAccess,
				),
			)

			// /api/projects/{project_id}/invites routes
			r.Method(
				"POST",
				"/projects/{project_id}/invites",
				auth.DoesUserHaveProjectAccess(
					requestlog.NewHandler(a.HandleCreateInvite, l),
					mw.URLParam,
					mw.AdminAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/invites",
				auth.DoesUserHaveProjectAccess(
					requestlog.NewHandler(a.HandleListProjectInvites, l),
					mw.URLParam,
					mw.AdminAccess,
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
				"POST",
				"/projects/{project_id}/invites/{invite_id}",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveInviteAccess(
						requestlog.NewHandler(a.HandleUpdateInviteRole, l),
						mw.URLParam,
						mw.URLParam,
					),
					mw.URLParam,
					mw.AdminAccess,
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
					mw.AdminAccess,
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
					mw.WriteAccess,
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
					mw.WriteAccess,
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
					mw.WriteAccess,
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
					mw.WriteAccess,
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
					mw.WriteAccess,
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
					mw.WriteAccess,
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
					mw.WriteAccess,
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
				"/projects/{project_id}/infra/{infra_id}/ecr/destroy",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveInfraAccess(
						requestlog.NewHandler(a.HandleDestroyAWSECRInfra, l),
						mw.URLParam,
						mw.URLParam,
					),
					mw.URLParam,
					mw.WriteAccess,
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
					mw.WriteAccess,
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
					mw.WriteAccess,
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
					mw.WriteAccess,
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
					mw.WriteAccess,
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
					mw.WriteAccess,
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
				"GET",
				"/projects/{project_id}/clusters/{cluster_id}/nodes",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleListNodes, l),
						mw.URLParam,
						mw.URLParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/clusters/{cluster_id}/node/{node_name}",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleGetNode, l),
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
				"/projects/{project_id}/integrations/aws/{aws_integration_id}/overwrite",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						auth.DoesUserHaveAWSIntegrationAccess(
							requestlog.NewHandler(a.HandleOverwriteAWSIntegration, l),
							mw.URLParam,
							mw.URLParam,
							false,
						),
						mw.URLParam,
						mw.QueryParam,
					),
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

			// /api/projects/{project_id}/slack_integrations routes
			r.Method(
				"GET",
				"/projects/{project_id}/slack_integrations",
				auth.DoesUserHaveProjectAccess(
					requestlog.NewHandler(a.HandleListSlackIntegrations, l),
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
					mw.ReadAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/helmrepos/{helm_id}/charts",
				auth.DoesUserHaveProjectAccess(
					requestlog.NewHandler(a.HandleListHelmRepoCharts, l),
					mw.URLParam,
					mw.ReadAccess,
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
					mw.ReadAccess,
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
					mw.ReadAccess,
				),
			)

			r.Method(
				"POST",
				"/projects/{project_id}/registries/{registry_id}/repository",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveRegistryAccess(
						requestlog.NewHandler(a.HandleCreateRepository, l),
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
					mw.ReadAccess,
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
				"/projects/{project_id}/releases/{name}/{revision}/pods/all",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleGetReleaseAllPods, l),
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
				"/projects/{project_id}/releases/{name}/webhook_token",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleCreateWebhookToken, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.WriteAccess,
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
				"/projects/{project_id}/gitrepos/{installation_id}/repos",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveGitInstallationAccess(
						requestlog.NewHandler(a.HandleListRepos, l),
						mw.URLParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/branches",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveGitInstallationAccess(
						requestlog.NewHandler(a.HandleGetBranches, l),
						mw.URLParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/buildpack/detect",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveGitInstallationAccess(
						requestlog.NewHandler(a.HandleDetectBuildpack, l),
						mw.URLParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/contents",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveGitInstallationAccess(
						requestlog.NewHandler(a.HandleGetBranchContents, l),
						mw.URLParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/procfile",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveGitInstallationAccess(
						requestlog.NewHandler(a.HandleGetProcfileContents, l),
						mw.URLParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/tarball_url",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveGitInstallationAccess(
						requestlog.NewHandler(a.HandleGetRepoZIPDownloadURL, l),
						mw.URLParam,
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
				"POST",
				"/projects/{project_id}/k8s/namespaces/create",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleCreateNamespace, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"DELETE",
				"/projects/{project_id}/k8s/namespaces/delete",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleDeleteNamespace, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/k8s/kubeconfig",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleGetTemporaryKubeconfig, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.WriteAccess,
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
				"/projects/{project_id}/k8s/prometheus/ingresses",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleListNGINXIngresses, l),
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
				"/projects/{project_id}/k8s/{namespace}/{chart}/{release_name}/jobs",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleListJobsByChart, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/k8s/{namespace}/{name}/jobs/status",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleGetJobStatus, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/k8s/jobs/{namespace}/{name}/pods",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleListJobPods, l),
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
				"/projects/{project_id}/k8s/helm_releases",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleStreamHelmReleases, l),
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

			r.Method(
				"DELETE",
				"/projects/{project_id}/k8s/pods/{namespace}/{name}",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleDeletePod, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.WriteAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/k8s/pods/{namespace}/{name}/events/list",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleListPodEvents, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"POST",
				"/projects/{project_id}/k8s/configmap/create",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleCreateConfigMap, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.WriteAccess,
				),
			)

			r.Method(
				"DELETE",
				"/projects/{project_id}/k8s/configmap/delete",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleDeleteConfigMap, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.WriteAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/k8s/configmap",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleGetConfigMap, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"GET",
				"/projects/{project_id}/k8s/configmap/list",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleListConfigMaps, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.ReadAccess,
				),
			)

			r.Method(
				"POST",
				"/projects/{project_id}/k8s/configmap/update",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleUpdateConfigMap, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.WriteAccess,
				),
			)

			r.Method(
				"DELETE",
				"/projects/{project_id}/k8s/jobs/{namespace}/{name}",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleDeleteJob, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.WriteAccess,
				),
			)

			r.Method(
				"POST",
				"/projects/{project_id}/k8s/jobs/{namespace}/{name}/stop",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleStopJob, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.WriteAccess,
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
					mw.WriteAccess,
				),
			)

			// capabilities
			r.Method(
				"GET",
				"/capabilities",
				http.HandlerFunc(a.HandleGetCapabilities),
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
					mw.WriteAccess,
				),
			)

			r.Method(
				"POST",
				"/projects/{project_id}/deploy/addon/{name}/{version}",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleDeployAddon, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.WriteAccess,
				),
			)
		})

		// Create group for long-running Helm operations
		r.Group(func(r chi.Router) {
			r.Use(middleware.Timeout(300 * time.Second))

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
					mw.WriteAccess,
				),
			)

			r.Method(
				"POST",
				"/webhooks/deploy/{token}",
				requestlog.NewHandler(a.HandleReleaseDeployWebhook, l),
			)

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
					mw.WriteAccess,
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
					mw.WriteAccess,
				),
			)

			r.Method(
				"POST",
				"/projects/{project_id}/releases/image/update/batch",
				auth.DoesUserHaveProjectAccess(
					auth.DoesUserHaveClusterAccess(
						requestlog.NewHandler(a.HandleReleaseUpdateJobImages, l),
						mw.URLParam,
						mw.QueryParam,
					),
					mw.URLParam,
					mw.WriteAccess,
				),
			)
		})
	})

	staticFilePath := a.ServerConf.StaticFilePath

	fs := http.FileServer(http.Dir(staticFilePath))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
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
