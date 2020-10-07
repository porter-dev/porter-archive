package kubernetes

import (
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// GetClientsetFromConfig is a simple wrapper that returns a *kubernetes.Clientset based on
// a clientcmd.ClientConfig
func GetClientsetFromConfig(conf clientcmd.ClientConfig) (*kubernetes.Clientset, error) {
	clientConf, err := conf.ClientConfig()

	if err != nil {
		return nil, err
	}

	return kubernetes.NewForConfig(clientConf)
}
