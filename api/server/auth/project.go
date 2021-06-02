package auth

import (
	"context"
	"net/http"

	"github.com/porter-dev/porter/api/types"
)

func NewProjectContext(ctx context.Context, project types.Project) context.Context {
	return context.WithValue(ctx, types.ProjectScope, project)
}

func ProjectScoped(h http.Handler, w http.ResponseWriter, r *http.Request) {
	// read the project id from the request

	// find a set of roles for this user and compute a policy document

	// determine if policy document allows for project scope

	// create a new project-scoped context
}
