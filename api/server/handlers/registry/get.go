package registry

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type RegistryGetHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewRegistryGetHandler(
	config *shared.Config,
	writer shared.ResultWriter,
) *RegistryGetHandler {
	return &RegistryGetHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *RegistryGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	registry, _ := r.Context().Value(types.RegistryScope).(*models.Registry)

	c.WriteResult(w, registry.ToRegistryType())
}
