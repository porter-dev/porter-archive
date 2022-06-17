package authz

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"gorm.io/gorm"
)

type GitlabIntegrationScopedFactory struct {
	config *config.Config
}

func NewGitlabIntegrationScopedFactory(
	config *config.Config,
) *GitlabIntegrationScopedFactory {
	return &GitlabIntegrationScopedFactory{config}
}

func (p *GitlabIntegrationScopedFactory) Middleware(next http.Handler) http.Handler {
	return &GitlabIntegrationScopedMiddleware{next, p.config}
}

type GitlabIntegrationScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (p *GitlabIntegrationScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project to check scopes
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// get the integration id from the URL param context
	reqScopes, _ := r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
	integrationID := reqScopes[types.GitlabIntegrationScope].Resource.UInt
	gi, err := p.config.Repo.GitlabIntegration().ReadGitlabIntegration(proj.ID, integrationID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrForbidden(
				fmt.Errorf("gitlab integration not found with id %d", integrationID),
			), true)

			return
		}

		apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	ctx := NewGitlabIntegrationContext(r.Context(), gi)
	r = r.Clone(ctx)
	p.next.ServeHTTP(w, r)
}

func NewGitlabIntegrationContext(ctx context.Context, gi *ints.GitlabIntegration) context.Context {
	return context.WithValue(ctx, types.GitlabIntegrationScope, gi)
}
