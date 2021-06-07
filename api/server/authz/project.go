package authz

import (
	"context"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ProjectScopedFactory struct {
	config *shared.Config
}

func NewProjectScopedFactory(
	config *shared.Config,
) *ProjectScopedFactory {
	return &ProjectScopedFactory{config}
}

func (p *ProjectScopedFactory) Middleware(next http.Handler) http.Handler {
	return &ProjectScopedMiddleware{next, p.config}
}

type ProjectScopedMiddleware struct {
	next   http.Handler
	config *shared.Config
}

func (p *ProjectScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// get the project id from the URL param context
	reqScopes, _ := r.Context().Value(RequestScopeCtxKey).(map[types.PermissionScope]*policy.RequestAction)

	projID := reqScopes[types.ProjectScope].Resource.UInt

	project, err := p.config.Repo.Project().ReadProject(projID)

	if err != nil {
		apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	ctx := NewProjectContext(r.Context(), project)
	r = r.WithContext(ctx)
	p.next.ServeHTTP(w, r)
}

func NewProjectContext(ctx context.Context, project *models.Project) context.Context {
	return context.WithValue(ctx, types.ProjectScope, project)
}
