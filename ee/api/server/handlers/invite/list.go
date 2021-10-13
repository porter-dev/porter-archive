// +build ee

package invite

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type InvitesListHandler struct {
	handlers.PorterHandlerWriter
}

func NewInvitesListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) http.Handler {
	return &InvitesListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InvitesListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	invites, err := c.Repo().Invite().ListInvitesByProjectID(project.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res types.ListInvitesResponse = make([]*types.Invite, 0)

	for _, invite := range invites {
		res = append(res, invite.ToInviteType())
	}

	c.WriteResult(w, r, res)
}
