package envgroup

import (
	"errors"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	v1 "k8s.io/api/core/v1"
)

func GetEnvGroup(agent *kubernetes.Agent, name, namespace string, version uint) (*types.EnvGroup, error) {
	var configMap *v1.ConfigMap
	var err error

	if version == 0 {
		configMap, _, err = agent.GetLatestVersionedConfigMap(name, namespace)
	} else {
		configMap, err = agent.GetVersionedConfigMap(name, namespace, version)
	}

	if err != nil && errors.Is(err, kubernetes.IsNotFoundError) {
		// if the configmap isn't found, search for a v1 configmap
		configMap, err = agent.GetConfigMap(name, namespace)

		if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}

	return ToEnvGroup(configMap)
}
