package authz

import (
	"context"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/repository"
)

type ProjectScopedFactory struct {
	projectRepo repository.ProjectRepository
	config      *shared.Config
}

func NewProjectScopedFactory(
	projectRepo repository.ProjectRepository,
	config *shared.Config,
) *ProjectScopedFactory {
	return &ProjectScopedFactory{projectRepo, config}
}

func (f *ProjectScopedFactory) NewProjectScoped(next http.Handler) http.Handler {
	return &ProjectScoped{next, f.projectRepo, f.config}
}

type ProjectScoped struct {
	next        http.Handler
	projectRepo repository.ProjectRepository
	config      *shared.Config
}

func (scope *ProjectScoped) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project id from the request
	_, reqErr := GetURLParamUint(r, "project_id")

	if reqErr != nil {
		apierrors.HandleAPIError(w, scope.config.Logger, reqErr)
		return
	}

	// find a set of roles for this user and compute a policy document

	// determine if policy document allows for project scope

	project := types.Project{}

	// create a new project-scoped context and serve
	r = r.WithContext(NewProjectContext(r.Context(), project))
	scope.next.ServeHTTP(w, r)
}

func NewProjectContext(ctx context.Context, project types.Project) context.Context {
	return context.WithValue(ctx, types.ProjectScope, project)
}
