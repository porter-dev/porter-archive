package metadata

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type ListClusterIntegrationsHandler struct {
	handlers.PorterHandlerWriter
}

func NewListClusterIntegrationsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListClusterIntegrationsHandler {
	return &ListClusterIntegrationsHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (v *ListClusterIntegrationsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	v.WriteResult(w, r, types.PorterClusterIntegrations)
}
