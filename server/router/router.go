package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/server/api"
	"github.com/porter-dev/porter/server/requestlog"
	mw "github.com/porter-dev/porter/server/router/middleware"

	sessionstore "github.com/porter-dev/porter/internal/auth"
)

// New creates a new Chi router instance
func New(a *api.App, store *sessionstore.PGStore, cookieName string) *chi.Mux {
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
		r.Method("GET", "/auth/check", requestlog.NewHandler(a.HandleAuthCheck, l))
		r.Method("POST", "/logout", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleLogoutUser, l)))

		// /api/charts routes
		r.Method("GET", "/charts", auth.DoesUserIDMatch(requestlog.NewHandler(a.HandleListCharts, l), mw.BodyParam))
		r.Method("GET", "/charts/{name}/{revision}", auth.DoesUserIDMatch(requestlog.NewHandler(a.HandleGetChart, l), mw.BodyParam))
	})

	return r
}
