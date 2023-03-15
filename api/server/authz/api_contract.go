package authz

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type APIContractRevisionScopedFactory struct {
	config *config.Config
}

func NewAPIContractRevisionScopedFactory(
	config *config.Config,
) *APIContractRevisionScopedFactory {
	return &APIContractRevisionScopedFactory{config}
}

func (p *APIContractRevisionScopedFactory) Middleware(next http.Handler) http.Handler {
	return &APIContractRevisionMiddleware{next, p.config}
}

type APIContractRevisionMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (n *APIContractRevisionMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	reqScopes, _ := ctx.Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	apiContractRevisionID := reqScopes[types.APIContractRevisionScope].Resource.Name

	uid, err := uuid.Parse(apiContractRevisionID)
	if err != nil {
		apierrors.HandleAPIError(n.config.Logger, n.config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	fmt.Println("STEFAN", uid)
	rev, err := n.config.Repo.APIContractRevisioner().Get(ctx, uid)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(n.config.Logger, n.config.Alerter, w, r, apierrors.NewErrForbidden(
				fmt.Errorf("revision with id %s not found in project %d", apiContractRevisionID, proj.ID),
			), true)
			return
		}
		apierrors.HandleAPIError(n.config.Logger, n.config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}
	fmt.Println("STEFANREV", rev)

	r = r.Clone(NewAPIContractRevisionContext(ctx, rev))
	n.next.ServeHTTP(w, r)
}

func NewAPIContractRevisionContext(ctx context.Context, apiContractRevision models.APIContractRevision) context.Context {
	return context.WithValue(ctx, types.APIContractRevisionScope, apiContractRevision)
}
