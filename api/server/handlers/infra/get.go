package infra

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type InfraGetHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewInfraGetHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *InfraGetHandler {
	return &InfraGetHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *InfraGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	c.WriteResult(w, r, infra.ToInfraType())
}
