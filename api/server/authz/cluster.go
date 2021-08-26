package authz

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
)

const KubernetesAgentCtxKey string = "k8s-agent"
const HelmAgentCtxKey string = "helm-agent"

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

type KubernetesAgentGetter interface {
	GetOutOfClusterConfig(cluster *models.Cluster) *kubernetes.OutOfClusterConfig
	GetAgent(r *http.Request, cluster *models.Cluster) (*kubernetes.Agent, error)
}

type OutOfClusterAgentGetter struct {
	config *shared.Config
}

func NewOutOfClusterAgentGetter(config *shared.Config) KubernetesAgentGetter {
	return &OutOfClusterAgentGetter{config}
}

func (d *OutOfClusterAgentGetter) GetOutOfClusterConfig(cluster *models.Cluster) *kubernetes.OutOfClusterConfig {
	return &kubernetes.OutOfClusterConfig{
		Repo:              d.config.Repo,
		DigitalOceanOAuth: d.config.DOConf,
		Cluster:           cluster,
	}
}

func (d *OutOfClusterAgentGetter) GetAgent(r *http.Request, cluster *models.Cluster) (*kubernetes.Agent, error) {
	// look for the agent in context
	ctxAgentVal := r.Context().Value(KubernetesAgentCtxKey)

	if ctxAgentVal != nil {
		if agent, ok := ctxAgentVal.(*kubernetes.Agent); ok {
			return agent, nil
		}
	}

	// if agent not found in context, get the agent from out of cluster config
	ooc := d.GetOutOfClusterConfig(cluster)

	agent, err := kubernetes.GetAgentOutOfClusterConfig(ooc)

	if err != nil {
		return nil, fmt.Errorf("failed to get agent: %s", err.Error())
	}

	newCtx := context.WithValue(r.Context(), KubernetesAgentCtxKey, agent)

	r = r.WithContext(newCtx)

	return agent, nil
}
