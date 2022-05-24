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
	config       *config.Config
	endpointMeta types.APIRequestMetadata
}

func NewProjectScopedFactory(
	config *config.Config,
	endpointMeta types.APIRequestMetadata,
) *ProjectScopedFactory {
	return &ProjectScopedFactory{config, endpointMeta}
}

func (p *ProjectScopedFactory) Middleware(next http.Handler) http.Handler {
	return &ProjectScopedMiddleware{next, p.endpointMeta, p.config}
}

type ProjectScopedMiddleware struct {
	next         http.Handler
	endpointMeta types.APIRequestMetadata
	config       *config.Config
}

func (p *ProjectScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// get the full map of scopes to resource actions
	reqScopes, reqErr := getRequestActionForEndpoint(r, p.endpointMeta)

	if reqErr != nil {
		apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, reqErr, true)
		return
	}

	projID := reqScopes[types.ProjectScope].Resource.UInt

	project, err := p.config.Repo.Project().ReadProject(projID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrForbidden(
				fmt.Errorf("project not found with id %d", projID),
			), true)

			return
		}

		apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	ctx := NewProjectContext(r.Context(), project)
	ctx = NewRequestScopeCtx(ctx, reqScopes)
	r = r.Clone(ctx)
	p.next.ServeHTTP(w, r)
}

func NewProjectContext(ctx context.Context, project *models.Project) context.Context {
	return context.WithValue(ctx, types.ProjectScope, project)
}
