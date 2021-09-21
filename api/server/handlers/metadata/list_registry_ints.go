package metadata

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type ListRegistryIntegrationsHandler struct {
	handlers.PorterHandlerWriter
}

func NewListRegistryIntegrationsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListRegistryIntegrationsHandler {
	return &ListRegistryIntegrationsHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (v *ListRegistryIntegrationsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	v.WriteResult(w, r, types.PorterRegistryIntegrations)
}
