package router

import (
	"net/http"
	"os"

	"github.com/go-chi/chi"
	"github.com/gorilla/sessions"
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
) *chi.Mux {
	l := a.Logger()
	r := chi.NewRouter()
	auth := mw.NewAuth(store, cookieName)

	r.Route("/api", func(r chi.Router) {
		r.Use(mw.ContentTypeJSON)

		// /api/users routes
		r.Method("GET", "/users/{id}", auth.DoesUserIDMatch(requestlog.NewHandler(a.HandleReadUser, l), mw.URLParam))
		r.Method("GET", "/users/{id}/contexts", auth.DoesUserIDMatch(requestlog.NewHandler(a.HandleReadUserContexts, l), mw.URLParam))
		r.Method("POST", "/users", requestlog.NewHandler(a.HandleCreateUser, l))
		r.Method("PUT", "/users/{id}", auth.DoesUserIDMatch(requestlog.NewHandler(a.HandleUpdateUser, l), mw.URLParam))
		r.Method("DELETE", "/users/{id}", auth.DoesUserIDMatch(requestlog.NewHandler(a.HandleDeleteUser, l), mw.URLParam))
		r.Method("POST", "/login", requestlog.NewHandler(a.HandleLoginUser, l))
		r.Method("GET", "/auth/check", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleAuthCheck, l)))
		r.Method("POST", "/logout", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleLogoutUser, l)))

		// /api/releases routes
		r.Method("GET", "/releases", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleListReleases, l)))
		r.Method("GET", "/releases/{name}/{revision}/components", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleGetReleaseComponents, l)))
		r.Method("GET", "/releases/{name}/history", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleListReleaseHistory, l)))
		r.Method("POST", "/releases/{name}/upgrade", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleUpgradeRelease, l)))
		r.Method("GET", "/releases/{name}/{revision}", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleGetRelease, l)))
		r.Method("POST", "/releases/{name}/rollback", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleRollbackRelease, l)))

		// /api/templates routes
		r.Method("GET", "/templates", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleListTemplates, l)))

		// /api/repos routes
		r.Method("GET", "/repos", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleListRepos, l)))
		r.Method("GET", "/repos/{kind}/{name}/branches", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleGetBranches, l)))
		r.Method("GET", "/repos/{kind}/{name}/{branch}/contents", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleGetBranchContents, l)))

		// /api/k8s routes
		r.Method("GET", "/k8s/namespaces", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleListNamespaces, l)))
		r.Method("GET", "/k8s/{namespace}/pod/{name}/logs", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleGetPodLogs, l)))
		r.Method("GET", "/k8s/pods", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleListPods, l)))
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
