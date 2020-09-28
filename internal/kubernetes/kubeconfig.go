package kubernetes

import (
	"fmt"

	"github.com/porter-dev/porter/internal/models"
)

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
//
// It accepts a list of cluster names that the user wishes to connect to
func (k *KubeConfig) ToClusterConfigs(allowedClusters []string) []models.ClusterConfig {
	clusters := make([]models.ClusterConfig, 0)

	// convert clusters, contexts, and users to maps for fast lookup
	clusterMap := k.createClusterMap()
	contextMap := k.createContextMap()
	userMap := k.createUserMap()

	// put allowed clusters in map
	aClusterMap := createAllowedClusterMap(allowedClusters)

	fmt.Println(allowedClusters, aClusterMap)

	// iterate through context maps and link to a user-cluster pair
	for contextName, context := range contextMap {
		userName := context.Context.User
		clusterName := context.Context.Cluster
		_, userFound := userMap[userName]
		cluster, clusterFound := clusterMap[clusterName]

		// make sure the cluster is "allowed"
		_, aClusterFound := aClusterMap[clusterName]

		fmt.Println(userFound, clusterFound, aClusterFound)

		if userFound && clusterFound && aClusterFound {
			clusters = append(clusters, models.ClusterConfig{
				Name:    clusterName,
				Server:  cluster.Cluster.Server,
				Context: contextName,
				User:    userName,
			})
		}
	}

	return clusters
}

// createAllowedClusterMap creates a map from a cluster name to a KubeConfigCluster object
func createAllowedClusterMap(clusters []string) map[string]string {
	aClusterMap := make(map[string]string)

	for _, cluster := range clusters {
		aClusterMap[cluster] = cluster
	}

	return aClusterMap
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
