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

type StackScopedFactory struct {
	config *config.Config
}

func NewStackScopedFactory(
	config *config.Config,
) *StackScopedFactory {
	return &StackScopedFactory{config}
}

func (p *StackScopedFactory) Middleware(next http.Handler) http.Handler {
	return &StackScopedMiddleware{next, p.config}
}

type StackScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (p *StackScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project to check scopes
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// get the registry id from the URL param context
	reqScopes, _ := r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
	stackID := reqScopes[types.StackScope].Resource.Name

	stack, err := p.config.Repo.Stack().ReadStackByStringID(proj.ID, stackID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrForbidden(
				fmt.Errorf("stack with id %s not found in project %d", stackID, proj.ID),
			), true)
		} else {
			apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		}

		return
	}

	ctx := NewStackContext(r.Context(), stack)
	r = r.Clone(ctx)
	p.next.ServeHTTP(w, r)
}

func NewStackContext(ctx context.Context, stack *models.Stack) context.Context {
	return context.WithValue(ctx, types.StackScope, stack)
}
