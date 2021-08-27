package invite

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type InviteGetHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewInviteGetHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *InviteGetHandler {
	return &InviteGetHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *InviteGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	invite, _ := r.Context().Value(types.InviteScope).(*models.Invite)

	c.WriteResult(r.Context(), w, invite.ToInviteType())
}
