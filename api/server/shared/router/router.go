package router

import (
	"net/http"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

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
