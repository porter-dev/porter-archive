package invite

import (
	"net/http"
	"time"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-invite-create")
	defer span.End()

	user, _ := ctx.Value(types.UserScope).(*models.User)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &types.CreateInviteRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "message", Value: "failed to decode and validate request"})
		return
	}

	//identities, _, err := c.Config().Ory.IdentityAPI.ListIdentities(context.WithValue(ctx, ory.ContextAccessToken, c.Config().OryApiKey)).CredentialsIdentifier(request.Email).Execute()
	//if err != nil {
	//	fmt.Println("dgt ory", err.Error())
	//	return
	//} else {
	//	fmt.Println("dgt ory", identities)
	//	return
	//}
	//
	//basicIdentityBody := ory.CreateIdentityBody{
	//	SchemaId: "preset://email",
	//	Traits:   map[string]interface{}{"email": request.Email},
	//}
	//
	//fmt.Println("dgt ory", c.Config().OryApiKey)
	//
	//identity, _, err := c.Config().Ory.IdentityAPI.CreateIdentity(context.WithValue(ctx, ory.ContextAccessToken, c.Config().OryApiKey)).CreateIdentityBody(basicIdentityBody).Execute()
	//if err != nil {
	//	err = telemetry.Error(ctx, span, err, "error creating identity")
	//	c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	//	return
	//}
	//
	//sevenDays := "7d"
	//createRecoveryBody := ory.CreateRecoveryLinkForIdentityBody{
	//	ExpiresIn:  &sevenDays,
	//	IdentityId: identity.Id,
	//}
	//
	//recoveryLink, _, err := c.Config().Ory.IdentityAPI.CreateRecoveryLinkForIdentity(context.WithValue(ctx, ory.ContextAccessToken, c.Config().OryApiKey)).CreateRecoveryLinkForIdentityBody(createRecoveryBody).Execute()
	//if err != nil || recoveryLink == nil {
	//	err = telemetry.Error(ctx, span, err, "error creating recovery link")
	//	c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	//	return
	//
	//}

	// create invite model
	invite, err := CreateInviteWithProject(request, project.ID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error creating invite with project")))
		return
	}

	invite.InvitingUserID = user.ID

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: invite.ProjectID},
		telemetry.AttributeKV{Key: "user-id", Value: invite.UserID},
		telemetry.AttributeKV{Key: "kind", Value: invite.Kind},
	)

	// write to database
	invite, err = c.Repo().Invite().CreateInvite(invite)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error creating invite in repo")))
		return
	}

	//if err := c.Config().UserNotifier.SendProjectInviteEmail(
	//	&notifier.SendProjectInviteEmailOpts{
	//		InviteeEmail:      request.Email,
	//		URL:               recoveryLink.RecoveryLink,
	//		Project:           project.Name,
	//		ProjectOwnerEmail: user.Email,
	//	},
	//); err != nil {
	//	c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error sending project invite email")))
	//	return
	//}

	res := types.CreateInviteResponse{
		Invite: invite.ToInviteType(),
	}

	c.WriteResult(w, r, res)
}

func CreateInviteWithProject(invite *types.CreateInviteRequest, projectID uint) (*models.Invite, error) {
	// generate a token and an expiry time
	expiry := time.Now().Add(7 * 24 * time.Hour)

	return &models.Invite{
		Token:     oauth.CreateRandomState(),
		Expiry:    &expiry,
		Email:     invite.Email,
		Kind:      invite.Kind,
		ProjectID: projectID,
		Status:    models.InvitePending,
	}, nil
}
