package authz

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
	"k8s.io/client-go/dynamic"
)

const KubernetesAgentCtxKey string = "k8s-agent"
const KubernetesDynamicClientCtxKey string = "k8s-dyn-client"
const HelmAgentCtxKey string = "helm-agent"

type ClusterScopedFactory struct {
	config *config.Config
}

func NewClusterScopedFactory(
	config *config.Config,
) *ClusterScopedFactory {
	return &ClusterScopedFactory{config}
}

func (p *ClusterScopedFactory) Middleware(next http.Handler) http.Handler {
	return &ClusterScopedMiddleware{next, p.config}
}

type ClusterScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (p *ClusterScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project to check scopes
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// get the cluster id from the URL param context
	reqScopes, _ := r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
	clusterID := reqScopes[types.ClusterScope].Resource.UInt
	cluster, err := p.config.Repo.Cluster().ReadCluster(proj.ID, clusterID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrForbidden(
				fmt.Errorf("cluster with id %d not found in project %d", clusterID, proj.ID),
			))
		} else {
			apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrInternal(err))
		}

		return
	}

	ctx := NewClusterContext(r.Context(), cluster)
	r = r.Clone(ctx)
	p.next.ServeHTTP(w, r)
}

func NewClusterContext(ctx context.Context, cluster *models.Cluster) context.Context {
	return context.WithValue(ctx, types.ClusterScope, cluster)
}

type KubernetesAgentGetter interface {
	GetOutOfClusterConfig(cluster *models.Cluster) *kubernetes.OutOfClusterConfig
	GetDynamicClient(r *http.Request, cluster *models.Cluster) (dynamic.Interface, error)
	GetAgent(r *http.Request, cluster *models.Cluster) (*kubernetes.Agent, error)
	GetHelmAgent(r *http.Request, cluster *models.Cluster) (*helm.Agent, error)
}

type OutOfClusterAgentGetter struct {
	config *config.Config
}

func NewOutOfClusterAgentGetter(config *config.Config) KubernetesAgentGetter {
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

func (d *OutOfClusterAgentGetter) GetHelmAgent(r *http.Request, cluster *models.Cluster) (*helm.Agent, error) {
	// look for the agent in context
	ctxAgentVal := r.Context().Value(HelmAgentCtxKey)

	if ctxAgentVal != nil {
		if agent, ok := ctxAgentVal.(*helm.Agent); ok {
			return agent, nil
		}
	}

	// if helm agent not found in context, construct it from k8s agent
	k8sAgent, err := d.GetAgent(r, cluster)

	if err != nil {
		return nil, err
	}

	// look for namespace in context, otherwise go with default
	reqScopes, _ := r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
	namespace := "default"

	if nsPolicy, ok := reqScopes[types.NamespaceScope]; ok {
		namespace = nsPolicy.Resource.Name
	}

	if strings.ToLower(namespace) == "all" {
		namespace = ""
	}

	helmAgent, err := helm.GetAgentFromK8sAgent("secret", namespace, d.config.Logger, k8sAgent)

	if err != nil {
		return nil, fmt.Errorf("failed to get Helm agent: %s", err.Error())
	}

	newCtx := context.WithValue(r.Context(), HelmAgentCtxKey, helmAgent)

	r = r.WithContext(newCtx)

	return helmAgent, nil
}

func (d *OutOfClusterAgentGetter) GetDynamicClient(r *http.Request, cluster *models.Cluster) (dynamic.Interface, error) {
	// look for the agent in context
	ctxDynClientVal := r.Context().Value(KubernetesDynamicClientCtxKey)

	if ctxDynClientVal != nil {
		if dynClient, ok := ctxDynClientVal.(dynamic.Interface); ok {
			return dynClient, nil
		}
	}

	return kubernetes.GetDynamicClientOutOfClusterConfig(d.GetOutOfClusterConfig(cluster))
}
