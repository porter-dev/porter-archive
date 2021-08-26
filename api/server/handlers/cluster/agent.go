package cluster

import (
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
)

type KubernetesAgentGetter interface {
	GetOutOfClusterConfig(cluster *models.Cluster) *kubernetes.OutOfClusterConfig
	GetAgent(cluster *models.Cluster) (*kubernetes.Agent, error)
}

type DefaultKubernetesAgentGetter struct {
	config *shared.Config
}

func NewDefaultKubernetesAgentGetter(config *shared.Config) KubernetesAgentGetter {
	return &DefaultKubernetesAgentGetter{config}
}

func (d *DefaultKubernetesAgentGetter) GetOutOfClusterConfig(cluster *models.Cluster) *kubernetes.OutOfClusterConfig {
	return &kubernetes.OutOfClusterConfig{
		Repo:              d.config.Repo,
		DigitalOceanOAuth: d.config.DOConf,
		Cluster:           cluster,
	}
}

func (d *DefaultKubernetesAgentGetter) GetAgent(cluster *models.Cluster) (*kubernetes.Agent, error) {
	ooc := d.GetOutOfClusterConfig(cluster)

	return kubernetes.GetAgentOutOfClusterConfig(ooc)
}
