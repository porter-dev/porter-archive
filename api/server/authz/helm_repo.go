package authz

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type HelmRepoScopedFactory struct {
	config *config.Config
}

func NewHelmRepoScopedFactory(
	config *config.Config,
) *HelmRepoScopedFactory {
	return &HelmRepoScopedFactory{config}
}

func (p *HelmRepoScopedFactory) Middleware(next http.Handler) http.Handler {
	return &HelmRepoScopedMiddleware{next, p.config}
}

type HelmRepoScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (p *HelmRepoScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project to check scopes
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// get the registry id from the URL param context
	reqScopes, _ := r.Context().Value(RequestScopeCtxKey).(map[types.PermissionScope]*policy.RequestAction)
	helmRepoID := reqScopes[types.HelmRepoScope].Resource.UInt

	helmRepo, err := p.config.Repo.HelmRepo().ReadHelmRepo(proj.ID, helmRepoID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(r.Context(), p.config, w, apierrors.NewErrForbidden(
				fmt.Errorf("helm repo with id %d not found in project %d", helmRepoID, proj.ID),
			))
		} else {
			apierrors.HandleAPIError(r.Context(), p.config, w, apierrors.NewErrInternal(err))
		}

		return
	}

	ctx := NewHelmRepoContext(r.Context(), helmRepo)
	r = r.WithContext(ctx)
	p.next.ServeHTTP(w, r)
}

func NewHelmRepoContext(ctx context.Context, helmRepo *models.HelmRepo) context.Context {
	return context.WithValue(ctx, types.HelmRepoScope, helmRepo)
}
