package kubernetes

import (
	"context"

	v1 "k8s.io/api/core/v1"
	v1Machinery "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// Agent is a Kubernetes agent for performing operations that interact with the
// api server
type Agent struct {
	RESTClientGetter genericclioptions.RESTClientGetter
	Clientset        *kubernetes.Clientset
}

// Form represents the options for connecting to a cluster externally and
// creating an Agent
type Form struct {
	KubeConfig      []byte
	AllowedContexts []string
	Context         string `json:"context" form:"required"`
	ConfigFlags     *genericclioptions.ConfigFlags
}

// ToAgent uses the Form to generate an agent
func (h *Form) ToAgent() (*Agent, error) {
	// create a client config using the app's helm/kubernetes agents
	conf, err := GetRestrictedClientConfigFromBytes(
		h.KubeConfig,
		h.Context,
		h.AllowedContexts,
	)

	if err != nil {
		return nil, err
	}

	clientConf, err := conf.ClientConfig()

	if err != nil {
		return nil, err
	}

	restClientGetter := NewRESTClientGetterFromClientConfig(clientConf)
	clientset, err := kubernetes.NewForConfig(clientConf)

	if err != nil {
		return nil, err
	}

	return &Agent{restClientGetter, clientset}, nil
}

// AgentFromInClusterConfig uses the service account that kubernetes
// gives to pods to connect
func AgentFromInClusterConfig() (*Agent, error) {
	conf, err := rest.InClusterConfig()

	if err != nil {
		return nil, err
	}

	restClientGetter := NewRESTClientGetterFromClientConfig(conf)
	clientset, err := kubernetes.NewForConfig(conf)

	return &Agent{restClientGetter, clientset}, nil
}

// ListNamespaces simply lists namespaces
func (a *Agent) ListNamespaces() (*v1.NamespaceList, error) {
	return a.Clientset.CoreV1().Namespaces().List(
		context.TODO(),
		v1Machinery.ListOptions{},
	)
}
