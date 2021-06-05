package shared

import (
	"net/http"

	"github.com/go-chi/chi"
)

type Route struct {
	Endpoint *APIEndpoint
	Handler  http.Handler
}

type Router struct {
	Router *chi.Mux
	Routes []*Route
	Config *Config
}

func (r *Router) RegisterRoutes() {
	for _, route := range r.Routes {
		r.Router.Method(
			string(route.Endpoint.Metadata.Method),
			route.Endpoint.Metadata.Path.RelativePath,
			route.Handler,
		)
	}
}
