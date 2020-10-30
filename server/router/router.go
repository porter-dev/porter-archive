package router

import (
	"net/http"
	"os"

	"github.com/go-chi/chi"
	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/server/api"
	"github.com/porter-dev/porter/server/requestlog"
	mw "github.com/porter-dev/porter/server/router/middleware"
)

// New creates a new Chi router instance
func New(
	a *api.App,
	store sessions.Store,
	cookieName string,
	staticFilePath string,
	repo *repository.Repository,
) *chi.Mux {
	l := a.Logger()
	r := chi.NewRouter()
	auth := mw.NewAuth(store, cookieName, repo)

	r.Route("/api", func(r chi.Router) {
		r.Use(mw.ContentTypeJSON)

		// /api/users routes
		r.Method("GET", "/users/{user_id}", auth.DoesUserIDMatch(requestlog.NewHandler(a.HandleReadUser, l), mw.URLParam))
		r.Method("GET", "/users/{user_id}/contexts", auth.DoesUserIDMatch(requestlog.NewHandler(a.HandleReadUserContexts, l), mw.URLParam))
		r.Method("POST", "/users", requestlog.NewHandler(a.HandleCreateUser, l))
		r.Method("PUT", "/users/{user_id}", auth.DoesUserIDMatch(requestlog.NewHandler(a.HandleUpdateUser, l), mw.URLParam))
		r.Method("DELETE", "/users/{user_id}", auth.DoesUserIDMatch(requestlog.NewHandler(a.HandleDeleteUser, l), mw.URLParam))
		r.Method("POST", "/login", requestlog.NewHandler(a.HandleLoginUser, l))
		r.Method("GET", "/auth/check", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleAuthCheck, l)))
		r.Method("POST", "/logout", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleLogoutUser, l)))

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

		r.Method("POST", "/projects", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleCreateProject, l)))

		r.Method(
			"POST",
			"/projects/{project_id}/candidates",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleCreateProjectSACandidates, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/candidates",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleListProjectSACandidates, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/candidates/{candidate_id}/resolve",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleResolveSACandidateActions, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		// /api/releases routes
		r.Method("GET", "/releases", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleListReleases, l)))
		r.Method("GET", "/releases/{name}/{revision}/components", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleGetReleaseComponents, l)))
		r.Method("GET", "/releases/{name}/history", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleListReleaseHistory, l)))
		r.Method("POST", "/releases/{name}/upgrade", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleUpgradeRelease, l)))
		r.Method("GET", "/releases/{name}/{revision}", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleGetRelease, l)))
		r.Method("POST", "/releases/{name}/rollback", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleRollbackRelease, l)))

		// /api/k8s routes
		r.Method("GET", "/k8s/namespaces", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleListNamespaces, l)))
	})

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
