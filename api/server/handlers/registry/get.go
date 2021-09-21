package registry

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type RegistryGetHandler struct {
	handlers.PorterHandlerWriter
}

func NewRegistryGetHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *RegistryGetHandler {
	return &RegistryGetHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *RegistryGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	registry, _ := r.Context().Value(types.RegistryScope).(*models.Registry)

	c.WriteResult(w, r, registry.ToRegistryType())
}
