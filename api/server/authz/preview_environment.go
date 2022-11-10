package authz

import (
	"errors"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

var (
	errPreviewProjectDisabled = errors.New("preview environments are not enabled for this project")
	errPreviewClusterDisabled = errors.New("preview environments are not enabled for this cluster")
)

type PreviewEnvironmentScopedFactory struct {
	config *config.Config
}

func NewPreviewEnvironmentScopedFactory(
	config *config.Config,
) *PreviewEnvironmentScopedFactory {
	return &PreviewEnvironmentScopedFactory{config}
}

func (p *PreviewEnvironmentScopedFactory) Middleware(next http.Handler) http.Handler {
	return &PreviewEnvironmentScopedMiddleware{next, p.config}
}

type PreviewEnvironmentScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (p *PreviewEnvironmentScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	if !project.PreviewEnvsEnabled {
		apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r,
			apierrors.NewErrForbidden(errPreviewProjectDisabled), true)
		return
	} else if !cluster.PreviewEnvsEnabled {
		apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r,
			apierrors.NewErrForbidden(errPreviewClusterDisabled), true)
		return
	}

	// FIXME: use this middleware to also get values for environment_id and deployment_id

	p.next.ServeHTTP(w, r)
}
