package user

import (
	"errors"
	fmt "fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
	"gorm.io/gorm"
)

type InviteResponseHandler struct {
	handlers.PorterHandlerReader
}

func NewInviteResponseHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
) http.Handler {
	return &InviteResponseHandler{
		PorterHandlerReader: handlers.NewDefaultPorterHandler(config, decoderValidator, nil),
	}
}

type InviteResponseRequest struct {
	AcceptedInviteIds []uint `json:"accepted_invite_ids"`
	DeclinedInviteIds []uint `json:"declined_invite_ids"`
}

func (c *InviteResponseHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-invite-response")
	defer span.End()

	user, _ := ctx.Value(types.UserScope).(*models.User)

	request := &InviteResponseRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding and validating request")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	invites, err := c.Repo().Invite().ListInvitesByEmail(user.Email)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error listing invites by email")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// create a map of pending invites by id
	invitesById := map[uint]*models.Invite{}
	for _, invite := range invites {
		// only consider pending invites
		if invite.Status == models.InvitePending {
			invitesById[invite.ID] = invite
		}
	}

	fmt.Println("dgt invitesById", invitesById)

	// accept invites and create roles in project
	for _, id := range request.AcceptedInviteIds {
		if invite, ok := invitesById[id]; ok {
			fmt.Println("dgt invite found", invite)

			project, err := c.Repo().Project().ReadProject(invite.ProjectID)
			if err != nil {
				// if the project is not found, skip
				if errors.Is(err, gorm.ErrRecordNotFound) {
					continue
				}
				err = telemetry.Error(ctx, span, err, "error reading project")
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			fmt.Println("dgt project found", project)

			if invite.Kind == "" {
				invite.Kind = models.RoleDeveloper
			}

			role := &models.Role{
				Role: types.Role{
					UserID:    user.ID,
					ProjectID: invite.ProjectID,
					Kind:      types.RoleKind(invite.Kind),
				},
			}

			if _, err := c.Repo().Project().ReadProjectRole(project.ID, user.ID); err != nil {
				fmt.Println("dgt role not found")

				if !errors.Is(err, gorm.ErrRecordNotFound) {
					err = telemetry.Error(ctx, span, err, "error reading project role")
					c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
					return
				}
				fmt.Println("edgt role creating")
				telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "new-role", Value: true})
				// only create if no role is found yet
				if role, err = c.Repo().Project().CreateProjectRole(project, role); err != nil {
					err = telemetry.Error(ctx, span, err, "error creating project role")
					c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
					return
				}
				fmt.Println("dgt role created")

			}

			// update the invite
			invite.UserID = user.ID
			invite.Status = models.InviteAccepted

			if _, err = c.Repo().Invite().UpdateInvite(invite); err != nil {
				err = telemetry.Error(ctx, span, err, "error updating invite")
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

		}
	}

	// decline invites
	for _, id := range request.DeclinedInviteIds {
		if invite, ok := invitesById[id]; ok {
			invite.Status = models.InviteDeclined

			if _, err = c.Repo().Invite().UpdateInvite(invite); err != nil {
				err = telemetry.Error(ctx, span, err, "error updating invite")
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
		}
	}

	return
}
