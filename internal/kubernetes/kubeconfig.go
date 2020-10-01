package kubernetes

import (
	"github.com/porter-dev/porter/internal/models"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

// GetRestrictedClientConfigFromBytes returns a clientcmd.ClientConfig from a raw kubeconfig,
// a context name, and the set of allowed clusters.
func GetRestrictedClientConfigFromBytes(
	bytes []byte,
	contextName string,
	allowedClusters []string,
) (clientcmd.ClientConfig, error) {
	config, err := clientcmd.NewClientConfigFromBytes(bytes)

	if err != nil {
		return nil, err
	}

	rawConf, err := config.RawConfig()

	if err != nil {
		return nil, err
	}

	// grab a copy to get the pointer and set clusters, authinfos, and contexts to empty
	copyConf := rawConf.DeepCopy()

	copyConf.Clusters = make(map[string]*api.Cluster)
	copyConf.AuthInfos = make(map[string]*api.AuthInfo)
	copyConf.Contexts = make(map[string]*api.Context)
	copyConf.CurrentContext = contextName

	// put allowed clusters in a map
	aClusterMap := createAllowedClusterMap(allowedClusters)

	// discover all allowed clusters
	for contextName, context := range rawConf.Contexts {
		userName := context.AuthInfo
		clusterName := context.Cluster
		authInfo, userFound := rawConf.AuthInfos[userName]
		cluster, clusterFound := rawConf.Clusters[clusterName]

		// make sure the cluster is "allowed"
		_, aClusterFound := aClusterMap[clusterName]

		if userFound && clusterFound && aClusterFound {
			copyConf.Clusters[clusterName] = cluster
			copyConf.AuthInfos[userName] = authInfo
			copyConf.Contexts[contextName] = context
		}
	}

	// validate the copyConf and create a ClientConfig
	err = clientcmd.Validate(*copyConf)

	if err != nil {
		return nil, err
	}

	clientConf := clientcmd.NewDefaultClientConfig(*copyConf, &clientcmd.ConfigOverrides{})

	return clientConf, nil
}

// GetAllClusterConfigsFromBytes converts a raw string to a set of ClusterConfigs
// by unmarshaling and calling (*KubeConfig).ToAllClusterConfigs
func GetAllClusterConfigsFromBytes(bytes []byte) ([]models.ClusterConfig, error) {
	config, err := clientcmd.NewClientConfigFromBytes(bytes)

	if err != nil {
		return nil, err
	}

	rawConf, err := config.RawConfig()

	if err != nil {
		return nil, err
	}

	err = clientcmd.Validate(rawConf)

	if err != nil {
		return nil, err
	}

	clusters := toAllClusterConfigs(&rawConf)

	return clusters, nil
}

// GetAllowedClusterConfigsFromBytes converts a raw string to a set of ClusterConfigs
// by unmarshaling and calling (*KubeConfig).ToAllowedClusterConfigs
func GetAllowedClusterConfigsFromBytes(bytes []byte, allowedClusters []string) ([]models.ClusterConfig, error) {
	config, err := clientcmd.NewClientConfigFromBytes(bytes)

	if err != nil {
		return nil, err
	}

	rawConf, err := config.RawConfig()

	if err != nil {
		return nil, err
	}

	err = clientcmd.Validate(rawConf)

	if err != nil {
		return nil, err
	}

	clusters := toAllowedClusterConfigs(&rawConf, allowedClusters)

	return clusters, nil
}

// toAllowedClusterConfigs converts a KubeConfig to a set of ClusterConfigs by
// joining users and clusters on the context.
//
// It accepts a list of cluster names that the user wishes to connect to
func toAllowedClusterConfigs(rawConf *api.Config, allowedClusters []string) []models.ClusterConfig {
	clusters := make([]models.ClusterConfig, 0)

	// put allowed clusters in map
	aClusterMap := createAllowedClusterMap(allowedClusters)

	// iterate through context maps and link to a user-cluster pair
	for contextName, context := range rawConf.Contexts {
		userName := context.AuthInfo
		clusterName := context.Cluster
		_, userFound := rawConf.AuthInfos[userName]
		cluster, clusterFound := rawConf.Clusters[clusterName]

		// make sure the cluster is "allowed"
		_, aClusterFound := aClusterMap[clusterName]

		if userFound && clusterFound && aClusterFound {
			clusters = append(clusters, models.ClusterConfig{
				Name:    clusterName,
				Server:  cluster.Server,
				Context: contextName,
				User:    userName,
			})
		}
	}

	return clusters
}

// toAllClusterConfigs converts a KubeConfig to a set of ClusterConfigs by
// joining users and clusters on the context.
func toAllClusterConfigs(rawConf *api.Config) []models.ClusterConfig {
	clusters := make([]models.ClusterConfig, 0)

	// iterate through context maps and link to a user-cluster pair
	for contextName, context := range rawConf.Contexts {
		userName := context.AuthInfo
		clusterName := context.Cluster
		_, userFound := rawConf.AuthInfos[userName]
		cluster, clusterFound := rawConf.Clusters[clusterName]

		if userFound && clusterFound {
			clusters = append(clusters, models.ClusterConfig{
				Name:    clusterName,
				Server:  cluster.Server,
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
