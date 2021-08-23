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

type ClusterScopedFactory struct {
	config *shared.Config
}

func NewClusterScopedFactory(
	config *shared.Config,
) *ClusterScopedFactory {
	return &ClusterScopedFactory{config}
}

func (p *ClusterScopedFactory) Middleware(next http.Handler) http.Handler {
	return &ClusterScopedMiddleware{next, p.config}
}

type ClusterScopedMiddleware struct {
	next   http.Handler
	config *shared.Config
}

func (p *ClusterScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// get the project id from the URL param context
	reqScopes, _ := r.Context().Value(RequestScopeCtxKey).(map[types.PermissionScope]*policy.RequestAction)

	clusterID := reqScopes[types.ClusterScope].Resource.UInt

	cluster, err := p.config.Repo.Cluster().ReadCluster(clusterID)

	if err != nil {
		apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	ctx := NewClusterContext(r.Context(), cluster)
	r = r.WithContext(ctx)
	p.next.ServeHTTP(w, r)
}

func NewClusterContext(ctx context.Context, cluster *models.Cluster) context.Context {
	return context.WithValue(ctx, types.ClusterScope, cluster)
}
