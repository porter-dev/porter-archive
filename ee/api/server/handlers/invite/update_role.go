//go:build ee
// +build ee

package invite

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

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

	if request.Kind == "" && len(request.RoleUIDs) == 0 {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("roles cannot be empty"), http.StatusBadRequest,
		))
		return
	}

	changed := false

	if len(request.RoleUIDs) > 0 {
		// check for valid project roles
		for _, roleUID := range request.RoleUIDs {
			_, err := c.Repo().ProjectRole().ReadProjectRole(project.ID, roleUID)

			if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
				c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("role not found in project: %s", roleUID)))
				return
			}
		}

		invite.Roles = []byte(strings.Join(request.RoleUIDs, ","))

		changed = true
	} else if request.Kind != "" { // legacy invite
		invite.Kind = request.Kind

		changed = true
	}

	if changed {
		if _, err := c.Repo().Invite().UpdateInvite(invite); err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		}
	}
}
