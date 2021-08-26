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
	"github.com/porter-dev/porter/internal/models/integrations"
	"gorm.io/gorm"
)

type GitInstallationScopedFactory struct {
	config *shared.Config
}

func NewGitInstallationScopedFactory(
	config *shared.Config,
) *GitInstallationScopedFactory {
	return &GitInstallationScopedFactory{config}
}

func (p *GitInstallationScopedFactory) Middleware(next http.Handler) http.Handler {
	return &GitInstallationScopedMiddleware{next, p.config}
}

type GitInstallationScopedMiddleware struct {
	next   http.Handler
	config *shared.Config
}

func (p *GitInstallationScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project to check scopes
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// get the registry id from the URL param context
	reqScopes, _ := r.Context().Value(RequestScopeCtxKey).(map[types.PermissionScope]*policy.RequestAction)
	gitInstallationID := reqScopes[types.GitInstallationScope].Resource.UInt

	gitInstallation, err := p.config.Repo.GithubAppInstallation().ReadGithubAppInstallation(proj.ID, gitInstallationID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrForbidden(
				fmt.Errorf("github app installation with id %d not found in project %d", gitInstallationID, proj.ID),
			))
		} else {
			apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrInternal(err))
		}

		return
	}

	ctx := NewGitInstallationContext(r.Context(), gitInstallation)
	r = r.WithContext(ctx)
	p.next.ServeHTTP(w, r)
}

func NewGitInstallationContext(ctx context.Context, ga *integrations.GithubAppInstallation) context.Context {
	return context.WithValue(ctx, types.GitInstallationScope, ga)
}
