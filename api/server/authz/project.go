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

type ProjectScopedFactory struct {
	config *config.Config
}

func NewProjectScopedFactory(
	config *config.Config,
) *ProjectScopedFactory {
	return &ProjectScopedFactory{config}
}

func (p *ProjectScopedFactory) Middleware(next http.Handler) http.Handler {
	return &ProjectScopedMiddleware{next, p.config}
}

type ProjectScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (p *ProjectScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// get the project id from the URL param context
	reqScopes, _ := r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)

	projID := reqScopes[types.ProjectScope].Resource.UInt

	project, err := p.config.Repo.Project().ReadProject(projID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrForbidden(
				fmt.Errorf("project not found with id %d", projID),
			), true)

			return
		}

		apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	ctx := NewProjectContext(r.Context(), project)
	r = r.Clone(ctx)
	p.next.ServeHTTP(w, r)
}

func NewProjectContext(ctx context.Context, project *models.Project) context.Context {
	return context.WithValue(ctx, types.ProjectScope, project)
}
