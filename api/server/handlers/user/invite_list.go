package user

import (
	"errors"
	"net/http"
	"time"

	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type UserListInvitesHandler struct {
	handlers.PorterHandlerWriter
}

func NewUserListInvitesHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *UserListInvitesHandler {
	return &UserListInvitesHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

type ListInvitesResponse []ProjectInvite

type ProjectInvite struct {
	Id      uint    `json:"id"`
	Status  string  `json:"status"`
	Project Project `json:"project"`
	Inviter User    `json:"inviter"`
}

type Project struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

type User struct {
	Email   string `json:"email"`
	Company string `json:"company"`
}

func (a *UserListInvitesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-user-list-invites")
	defer span.End()

	user, _ := r.Context().Value(types.UserScope).(*models.User)

	if user == nil {
		err := telemetry.Error(ctx, span, nil, "user not found in context")
		a.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	invites, err := a.Repo().Invite().ListInvitesByEmail(user.Email)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing invites by email")
		a.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res ListInvitesResponse

	for _, invite := range invites {
		if invite.Status != "pending" || (invite.Expiry != nil && time.Since(*invite.Expiry) > 0) {
			continue
		}

		project, err := a.Repo().Project().ReadProject(invite.ProjectID)
		if err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				err := telemetry.Error(ctx, span, err, "error reading project")
				a.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			// if the project is not found, skip
			continue
		}

		inviter, err := a.Repo().User().ReadUser(invite.InvitingUserID)
		if err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				err := telemetry.Error(ctx, span, err, "error reading user")
				a.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			// if user who originally invited is not found, skip
			continue
		}

		res = append(res, ProjectInvite{
			Id:     invite.ID,
			Status: string(invite.Status),
			Project: Project{
				ID:   project.ID,
				Name: project.Name,
			},
			Inviter: User{
				Email:   inviter.Email,
				Company: inviter.CompanyName,
			},
		})
	}

	a.WriteResult(w, r, res)
}
