//go:build ee
// +build ee

package invite

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type InviteUpdateRoleHandler struct {
	handlers.PorterHandlerReader
}

func NewInviteUpdateRoleHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
) http.Handler {
	return &InviteUpdateRoleHandler{
		PorterHandlerReader: handlers.NewDefaultPorterHandler(config, decoderValidator, nil),
	}
}

func (c *InviteUpdateRoleHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	invite, _ := r.Context().Value(types.InviteScope).(*models.Invite)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.UpdateInviteRoleRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	changed := false

	if request.ProjectRoleUID != "" {
		_, err := c.Repo().ProjectRole().ReadProjectRole(project.ID, request.ProjectRoleUID)

		if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("no such role exists")))
			return
		}

		invite.ProjectRoleUID = request.ProjectRoleUID

		changed = true
	} else if invite.Kind != "" {
		invite.Kind = request.Kind

		changed = true
	}

	if changed {
		if _, err := c.Repo().Invite().UpdateInvite(invite); err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		}
	}

	w.WriteHeader(http.StatusOK)
}
