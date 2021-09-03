package authz

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type InviteScopedFactory struct {
	config *config.Config
}

func NewInviteScopedFactory(
	config *config.Config,
) *InviteScopedFactory {
	return &InviteScopedFactory{config}
}

func (p *InviteScopedFactory) Middleware(next http.Handler) http.Handler {
	return &InviteScopedMiddleware{next, p.config}
}

type InviteScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (p *InviteScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project to check scopes
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// get the invite id from the URL param context
	reqScopes, _ := r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
	inviteID := reqScopes[types.InviteScope].Resource.UInt

	invite, err := p.config.Repo.Invite().ReadInvite(proj.ID, inviteID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrForbidden(
				fmt.Errorf("invite with id %d not found in project %d", inviteID, proj.ID),
			))
		} else {
			apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrInternal(err))
		}

		return
	}

	ctx := NewInviteContext(r.Context(), invite)
	r = r.WithContext(ctx)
	p.next.ServeHTTP(w, r)
}

func NewInviteContext(ctx context.Context, invite *models.Invite) context.Context {
	return context.WithValue(ctx, types.InviteScope, invite)
}
