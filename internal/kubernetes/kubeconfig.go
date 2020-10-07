package kubernetes

import (
	"github.com/porter-dev/porter/internal/models"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

// GetRestrictedClientConfigFromBytes returns a clientcmd.ClientConfig from a raw kubeconfig,
// a context name, and the set of allowed contexts.
func GetRestrictedClientConfigFromBytes(
	bytes []byte,
	contextName string,
	allowedContexts []string,
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
	aContextMap := createAllowedContextMap(allowedContexts)

	// discover all allowed clusters
	for name, context := range rawConf.Contexts {
		userName := context.AuthInfo
		clusterName := context.Cluster
		authInfo, userFound := rawConf.AuthInfos[userName]
		cluster, clusterFound := rawConf.Clusters[clusterName]

		// make sure the cluster is "allowed"
		_, isAllowed := aContextMap[name]

		if userFound && clusterFound && isAllowed {
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

// GetContextsFromBytes converts a raw string to a set of Contexts
// by unmarshaling and calling toContexts
func GetContextsFromBytes(bytes []byte, allowedContexts []string) ([]models.Context, error) {
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

	contexts := toContexts(&rawConf, allowedContexts)

	return contexts, nil

}

func toContexts(rawConf *api.Config, allowedContexts []string) []models.Context {
	contexts := make([]models.Context, 0)

	// put allowed clusters in map
	aContextMap := createAllowedContextMap(allowedContexts)

	// iterate through contexts and switch on selected
	for name, context := range rawConf.Contexts {
		_, isAllowed := aContextMap[name]
		_, userFound := rawConf.AuthInfos[context.AuthInfo]
		cluster, clusterFound := rawConf.Clusters[context.Cluster]

		if userFound && clusterFound && isAllowed {
			contexts = append(contexts, models.Context{
				Name:     name,
				Server:   cluster.Server,
				Cluster:  context.Cluster,
				User:     context.AuthInfo,
				Selected: true,
			})
		} else if userFound && clusterFound {
			contexts = append(contexts, models.Context{
				Name:     name,
				Server:   cluster.Server,
				Cluster:  context.Cluster,
				User:     context.AuthInfo,
				Selected: false,
			})
		}
	}

	return contexts
}

// createAllowedContextMap creates a dummy map from context name to context name
func createAllowedContextMap(contexts []string) map[string]string {
	aContextMap := make(map[string]string)

	for _, context := range contexts {
		aContextMap[context] = context
	}

	return aContextMap
}

// func ReadLocalKubeConfig()
