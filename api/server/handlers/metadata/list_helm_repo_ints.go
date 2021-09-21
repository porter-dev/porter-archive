package metadata

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type ListHelmRepoIntegrationsHandler struct {
	handlers.PorterHandlerWriter
}

func NewListHelmRepoIntegrationsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListHelmRepoIntegrationsHandler {
	return &ListHelmRepoIntegrationsHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (v *ListHelmRepoIntegrationsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	v.WriteResult(w, r, types.PorterHelmRepoIntegrations)
}
