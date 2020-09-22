package kubernetes

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

// ClusterConfig represents the configuration for a single cluster-user pair. This gets
// associated with a specific user, and is primarily used for simplicity.
type ClusterConfig struct {
	// Name is the name of the cluster
	Name,
	// Server is the endpoint of the kube apiserver for a cluster
	Server,
	// Context is the name of the context
	Context,
	// User is the name of the user for a cluster
	User string
}

// ToClusterConfigs converts a KubeConfig to a set of ClusterConfigs by
// joining users and clusters on the context.
func (k *KubeConfig) ToClusterConfigs() []*ClusterConfig {
	clusters := make([]*ClusterConfig, 0)

	// convert clusters, contexts, and users to maps for fast lookup
	clusterMap := k.CreateClusterMap()
	contextMap := k.CreateContextMap()
	userMap := k.CreateUserMap()

	// iterate through context maps and link to a user-cluster pair
	for contextName, context := range contextMap {
		userName := context.Context.User
		clusterName := context.Context.Cluster
		_, userFound := userMap[userName]
		cluster, clusterFound := clusterMap[clusterName]

		if userFound && clusterFound {
			clusters = append(clusters, &ClusterConfig{
				Name:    clusterName,
				Server:  cluster.Cluster.Server,
				Context: contextName,
				User:    userName,
			})
		}
	}

	return clusters
}

// CreateClusterMap creates a map from a cluster name to a KubeConfigCluster object
func (k *KubeConfig) CreateClusterMap() map[string]KubeConfigCluster {
	clusterMap := make(map[string]KubeConfigCluster)

	for _, cluster := range k.Clusters {
		clusterMap[cluster.Name] = cluster
	}

	return clusterMap
}

// CreateContextMap creates a map from a context name to a KubeConfigContext object
func (k *KubeConfig) CreateContextMap() map[string]KubeConfigContext {
	contextMap := make(map[string]KubeConfigContext)

	for _, context := range k.Contexts {
		contextMap[context.Name] = context
	}

	return contextMap
}

// CreateUserMap creates a map from a user name to a KubeConfigUser object
func (k *KubeConfig) CreateUserMap() map[string]KubeConfigUser {
	userMap := make(map[string]KubeConfigUser)

	for _, user := range k.Users {
		userMap[user.Name] = user
	}

	return userMap
}
