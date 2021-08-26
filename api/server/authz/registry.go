package authz

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type RegistryScopedFactory struct {
	config *shared.Config
}

func NewRegistryScopedFactory(
	config *shared.Config,
) *RegistryScopedFactory {
	return &RegistryScopedFactory{config}
}

func (p *RegistryScopedFactory) Middleware(next http.Handler) http.Handler {
	return &RegistryScopedMiddleware{next, p.config}
}

type RegistryScopedMiddleware struct {
	next   http.Handler
	config *shared.Config
}

func (p *RegistryScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project to check scopes
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// get the registry id from the URL param context
	reqScopes, _ := r.Context().Value(RequestScopeCtxKey).(map[types.PermissionScope]*policy.RequestAction)
	registryID := reqScopes[types.RegistryScope].Resource.UInt

	registry, err := p.config.Repo.Registry().ReadRegistry(proj.ID, registryID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrForbidden(
				fmt.Errorf("registry with id %d not found in project %d", registryID, proj.ID),
			))
		} else {
			apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrInternal(err))
		}

		return
	}

	ctx := NewRegistryContext(r.Context(), registry)
	r = r.WithContext(ctx)
	p.next.ServeHTTP(w, r)
}

func NewRegistryContext(ctx context.Context, registry *models.Registry) context.Context {
	return context.WithValue(ctx, types.RegistryScope, registry)
}
