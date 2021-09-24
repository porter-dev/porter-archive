package authz

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"helm.sh/helm/v3/pkg/release"
)

type ReleaseScopedFactory struct {
	config *config.Config
}

func NewReleaseScopedFactory(
	config *config.Config,
) *ReleaseScopedFactory {
	return &ReleaseScopedFactory{config}
}

func (p *ReleaseScopedFactory) Middleware(next http.Handler) http.Handler {
	return &ReleaseScopedMiddleware{next, p.config, NewOutOfClusterAgentGetter(p.config)}
}

type ReleaseScopedMiddleware struct {
	next        http.Handler
	config      *config.Config
	agentGetter KubernetesAgentGetter
}

func (p *ReleaseScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	helmAgent, err := p.agentGetter.GetHelmAgent(r, cluster, "")

	if err != nil {
		apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// get the name of the application
	reqScopes, _ := r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
	name := reqScopes[types.ReleaseScope].Resource.Name

	// get the version for the application
	version, _ := requestutils.GetURLParamUint(r, types.URLParamReleaseVersion)

	release, err := helmAgent.GetRelease(name, int(version), false)

	if err != nil {
		// ugly casing since at the time of this commit Helm doesn't have an errors package.
		// so we rely on the Helm error containing "not found"
		if strings.Contains(err.Error(), "not found") {
			apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("release not found"),
				http.StatusNotFound,
			), true)
		} else {
			apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrInternal(err), true)
		}

		return
	}

	ctx := NewReleaseContext(r.Context(), release)
	r = r.Clone(ctx)
	p.next.ServeHTTP(w, r)
}

func NewReleaseContext(ctx context.Context, helmRelease *release.Release) context.Context {
	return context.WithValue(ctx, types.ReleaseScope, helmRelease)
}
