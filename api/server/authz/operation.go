package authz

import (
	"context"
	"errors"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type OperationScopedFactory struct {
	config *config.Config
}

func NewOperationScopedFactory(
	config *config.Config,
) *OperationScopedFactory {
	return &OperationScopedFactory{config}
}

func (p *OperationScopedFactory) Middleware(next http.Handler) http.Handler {
	return &OperationScopedMiddleware{next, p.config}
}

type OperationScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (p *OperationScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	reqScopes, _ := r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
	operationID := reqScopes[types.OperationScope].Resource.Name

	// look for matching operation for the infra
	operation, err := p.config.Repo.Infra().ReadOperation(infra.ID, operationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrForbidden(err), true)
			return
		}

		apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	ctx := NewOperationContext(r.Context(), operation)
	r = r.Clone(ctx)
	p.next.ServeHTTP(w, r)
}

func NewOperationContext(ctx context.Context, operation *models.Operation) context.Context {
	return context.WithValue(ctx, types.OperationScope, operation)
}
