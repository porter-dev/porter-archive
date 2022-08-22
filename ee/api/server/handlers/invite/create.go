//go:build ee
// +build ee

package invite

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/oauth"
	"gorm.io/gorm"
)

type InviteCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewInviteCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) http.Handler {
	return &InviteCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *InviteCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateInviteRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if len(request.RoleUIDs) == 0 {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("roles cannot be empty"), http.StatusPreconditionFailed,
		))
		return
	} else {
		// check for valid project roles
		for _, role := range request.RoleUIDs {
			_, err := c.Repo().ProjectRole().ReadProjectRole(project.ID, role)

			if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
				c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("role not found in project: %s", role)))
				return
			}
		}
	}

	// create invite model
	invite, err := CreateInviteWithProject(request, project.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// write to database
	invite, err = c.Repo().Invite().CreateInvite(invite)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if err := c.Config().UserNotifier.SendProjectInviteEmail(
		&notifier.SendProjectInviteEmailOpts{
			InviteeEmail:      request.Email,
			URL:               fmt.Sprintf("%s/api/projects/%d/invites/%s", c.Config().ServerConf.ServerURL, project.ID, invite.Token),
			Project:           project.Name,
			ProjectOwnerEmail: user.Email,
		},
	); err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := types.CreateInviteResponse{
		Invite: invite.ToInviteType(),
	}

	c.WriteResult(w, r, res)
}

func CreateInviteWithProject(invite *types.CreateInviteRequest, projectID uint) (*models.Invite, error) {
	// generate a token and an expiry time
	expiry := time.Now().Add(24 * time.Hour)

	return &models.Invite{
		Email:     invite.Email,
		Kind:      invite.Kind,
		Expiry:    &expiry,
		ProjectID: projectID,
		Token:     oauth.CreateRandomState(),
		Roles:     []byte(strings.Join(invite.RoleUIDs, ",")),
	}, nil
}
