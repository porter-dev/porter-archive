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

type ListInvitesHandler struct {
	handlers.PorterHandlerWriter
}

func NewListInvitesHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListInvitesHandler {
	return &ListInvitesHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *ListInvitesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
