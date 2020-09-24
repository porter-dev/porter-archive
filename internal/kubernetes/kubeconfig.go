package kubernetes

import "github.com/porter-dev/porter/internal/models"

// KubeConfigCluster represents the cluster field in a kubeconfig
type KubeConfigCluster struct {
	Cluster struct {
		Server string `yaml:"server"`
	} `yaml:"cluster"`
	Name string `yaml:"name"`
}

// KubeConfigContext represents the context field in a kubeconfig
type KubeConfigContext struct {
	Context struct {
		Cluster string `yaml:"cluster"`
		User    string `yaml:"user"`
	} `yaml:"context"`
	Name string `yaml:"name"`
}

// KubeConfigUser represents the user field in a kubeconfig
type KubeConfigUser struct {
	Name string `yaml:"name"`
}

// KubeConfig represents an unmarshaled kubeconfig
type KubeConfig struct {
	CurrentContext string              `yaml:"current-context"`
	Clusters       []KubeConfigCluster `yaml:"clusters"`
	Contexts       []KubeConfigContext `yaml:"contexts"`
	Users          []KubeConfigUser    `yaml:"users"`
}

// ToClusterConfigs converts a KubeConfig to a set of ClusterConfigExternals by
// joining users and clusters on the context.
func (k *KubeConfig) ToClusterConfigs() []*models.ClusterConfigExternal {
	clusters := make([]*models.ClusterConfigExternal, 0)

	// convert clusters, contexts, and users to maps for fast lookup
	clusterMap := k.createClusterMap()
	contextMap := k.createContextMap()
	userMap := k.createUserMap()

	// iterate through context maps and link to a user-cluster pair
	for contextName, context := range contextMap {
		userName := context.Context.User
		clusterName := context.Context.Cluster
		_, userFound := userMap[userName]
		cluster, clusterFound := clusterMap[clusterName]

		if userFound && clusterFound {
			clusters = append(clusters, &models.ClusterConfigExternal{
				Name:    clusterName,
				Server:  cluster.Cluster.Server,
				Context: contextName,
				User:    userName,
			})
		}
	}

	return clusters
}

// createClusterMap creates a map from a cluster name to a KubeConfigCluster object
func (k *KubeConfig) createClusterMap() map[string]KubeConfigCluster {
	clusterMap := make(map[string]KubeConfigCluster)

	for _, cluster := range k.Clusters {
		clusterMap[cluster.Name] = cluster
	}

	return clusterMap
}

// createContextMap creates a map from a context name to a KubeConfigContext object
func (k *KubeConfig) createContextMap() map[string]KubeConfigContext {
	contextMap := make(map[string]KubeConfigContext)

	for _, context := range k.Contexts {
		contextMap[context.Name] = context
	}

	return contextMap
}

// createUserMap creates a map from a user name to a KubeConfigUser object
func (k *KubeConfig) createUserMap() map[string]KubeConfigUser {
	userMap := make(map[string]KubeConfigUser)

	for _, user := range k.Users {
		userMap[user.Name] = user
	}

	return userMap
}
