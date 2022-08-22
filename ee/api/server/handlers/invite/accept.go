//go:build ee
// +build ee

package invite

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type InviteAcceptHandler struct {
	handlers.PorterHandler
}

func NewInviteAcceptHandler(
	config *config.Config,
) http.Handler {
	return &InviteAcceptHandler{
		PorterHandler: handlers.NewDefaultPorterHandler(config, nil, nil),
	}
}

func (c *InviteAcceptHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	projectID, _ := requestutils.GetURLParamUint(r, types.URLParamProjectID)
	token, _ := requestutils.GetURLParamString(r, types.URLParamInviteToken)

	proj, err := c.Repo().Project().ReadProject(projectID)

	if err != nil {
		vals := url.Values{}

		if errors.Is(err, gorm.ErrRecordNotFound) {
			vals.Add("error", "Invalid invite token")
		} else {
			vals.Add("error", "Unknown error")
		}

		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", vals.Encode()), 302)
		return
	}

	invite, err := c.Repo().Invite().ReadInviteByToken(token)

	if err != nil || invite.ProjectID != proj.ID {
		vals := url.Values{}
		vals.Add("error", "Invalid invite token")
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", vals.Encode()), 302)

		return
	}

	// check that the invite has not expired and has not been accepted
	if invite.IsExpired() || invite.IsAccepted() {
		vals := url.Values{}
		vals.Add("error", "Invite has expired")
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", vals.Encode()), 302)

		return
	}

	// check that the invite email matches the user's email
	if user.Email != invite.Email {
		vals := url.Values{}
		vals.Add("error", "Wrong email for invite")
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", vals.Encode()), 302)

		return
	}

	inviteType := invite.ToInviteType()

	if len(inviteType.Roles) > 0 {
		for _, roleUID := range inviteType.Roles {
			err := updateProjectRoleWithUser(c.Repo(), proj.ID, user.ID, roleUID)

			if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
				c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("no such role exists")))
				return
			} else if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
		}
	} else { // legacy operation
		kind := invite.Kind

		if kind == "" {
			kind = models.RoleDeveloper
		}

		err := updateProjectRoleWithUser(c.Repo(), proj.ID, user.ID, fmt.Sprintf("%d-%s", proj.ID, kind))

		if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("no such role exists")))
			return
		} else if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	// update the invite
	invite.UserID = user.ID

	if _, err = c.Repo().Invite().UpdateInvite(invite); err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	http.Redirect(w, r, "/dashboard", 302)
}

func updateProjectRoleWithUser(repo repository.Repository, projectID, userID uint, projectRoleUID string) error {
	role, err := repo.ProjectRole().ReadProjectRole(projectID, projectRoleUID)

	if err != nil {
		return err
	}

	userAlreadyInRole := false
	var userIDs []uint

	for _, u := range role.Users {
		if u.ID == userID {
			userAlreadyInRole = true
			break
		}

		userIDs = append(userIDs, u.ID)
	}

	if !userAlreadyInRole {
		userIDs = append(userIDs, userID)

		err := repo.ProjectRole().UpdateUsersInProjectRole(projectID, role.UniqueID, userIDs)

		if err != nil {
			return err
		}
	}

	return nil
}
