package authz

import (
	"context"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/models"
	"helm.sh/helm/v3/pkg/release"
)

type ReleaseScopedFactory struct {
	config *shared.Config
}

func NewReleaseScopedFactory(
	config *shared.Config,
) *ReleaseScopedFactory {
	return &ReleaseScopedFactory{config}
}

func (p *ReleaseScopedFactory) Middleware(next http.Handler) http.Handler {
	return &ReleaseScopedMiddleware{next, p.config, NewOutOfClusterAgentGetter(p.config)}
}

type ReleaseScopedMiddleware struct {
	next        http.Handler
	config      *shared.Config
	agentGetter KubernetesAgentGetter
}

func (p *ReleaseScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// get the project id from the URL param context
	reqScopes, _ := r.Context().Value(RequestScopeCtxKey).(map[types.PermissionScope]*policy.RequestAction)

	// get the name and the namespace of the application
	namespace := reqScopes[types.NamespaceScope].Resource.Name
	name := reqScopes[types.ReleaseScope].Resource.Name

	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	k8sAgent, err := p.agentGetter.GetAgent(r, cluster)

	if err != nil {
		apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	helmAgent, err := helm.GetAgentFromK8sAgent("secret", namespace, p.config.Logger, k8sAgent)

	if err != nil {
		apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	release, err := helmAgent.GetRelease(name, 0)

	if err != nil {
		apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	ctx := NewReleaseContext(r.Context(), release)
	r = r.WithContext(ctx)
	p.next.ServeHTTP(w, r)
}

func NewReleaseContext(ctx context.Context, helmRelease *release.Release) context.Context {
	return context.WithValue(ctx, types.ReleaseScope, helmRelease)
}
