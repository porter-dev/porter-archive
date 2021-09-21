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

type InfraScopedFactory struct {
	config *config.Config
}

func NewInfraScopedFactory(
	config *config.Config,
) *InfraScopedFactory {
	return &InfraScopedFactory{config}
}

func (p *InfraScopedFactory) Middleware(next http.Handler) http.Handler {
	return &InfraScopedMiddleware{next, p.config}
}

type InfraScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (p *InfraScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project to check scopes
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// get the registry id from the URL param context
	reqScopes, _ := r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
	infraID := reqScopes[types.InfraScope].Resource.UInt

	infra, err := p.config.Repo.Infra().ReadInfra(proj.ID, infraID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrForbidden(
				fmt.Errorf("infra with id %d not found in project %d", infraID, proj.ID),
			))
		} else {
			apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrInternal(err))
		}

		return
	}

	ctx := NewInfraContext(r.Context(), infra)
	r = r.Clone(ctx)
	p.next.ServeHTTP(w, r)
}

func NewInfraContext(ctx context.Context, infra *models.Infra) context.Context {
	return context.WithValue(ctx, types.InfraScope, infra)
}
