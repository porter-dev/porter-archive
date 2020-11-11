package helm

import (
	"errors"
	"io/ioutil"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/models"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chartutil"
	"helm.sh/helm/v3/pkg/kube"
	kubefake "helm.sh/helm/v3/pkg/kube/fake"
	"helm.sh/helm/v3/pkg/storage"
	k8s "k8s.io/client-go/kubernetes"
)

// Form represents the options for connecting to a cluster and
// creating a Helm agent
type Form struct {
	ServiceAccount *models.ServiceAccount `form:"required"`
	ClusterID      uint                   `json:"cluster_id" form:"required"`
	Storage        string                 `json:"storage" form:"oneof=secret configmap memory"`
	Namespace      string                 `json:"namespace"`
}

// GetAgentOutOfClusterConfig creates a new Agent from outside the cluster using
// the underlying kubernetes.GetAgentOutOfClusterConfig method
func GetAgentOutOfClusterConfig(form *Form, l *logger.Logger) (*Agent, error) {
	// create a kubernetes agent
	conf := &kubernetes.OutOfClusterConfig{
		ServiceAccount: form.ServiceAccount,
		ClusterID:      form.ClusterID,
	}

	k8sAgent, err := kubernetes.GetAgentOutOfClusterConfig(conf)

	if err != nil {
		return nil, err
	}

	clientset, ok := k8sAgent.Clientset.(*k8s.Clientset)

	if !ok {
		return nil, errors.New("Agent Clientset was not of type *(k8s.io/client-go/kubernetes).Clientset")
	}

	// use k8s agent to create Helm agent
	return &Agent{&action.Configuration{
		RESTClientGetter: k8sAgent.RESTClientGetter,
		KubeClient:       kube.New(k8sAgent.RESTClientGetter),
		Releases:         StorageMap[form.Storage](l, clientset.CoreV1(), form.Namespace),
		Log:              l.Printf,
	}}, nil
}

// GetAgentInClusterConfig creates a new Agent from inside the cluster using
// the underlying kubernetes.GetAgentInClusterConfig method
func GetAgentInClusterConfig(form *Form, l *logger.Logger) (*Agent, error) {
	// create a kubernetes agent
	k8sAgent, err := kubernetes.GetAgentInClusterConfig()

	if err != nil {
		return nil, err
	}

	clientset, ok := k8sAgent.Clientset.(*k8s.Clientset)

	if !ok {
		return nil, errors.New("Agent Clientset was not of type *(k8s.io/client-go/kubernetes).Clientset")
	}

	// use k8s agent to create Helm agent
	return &Agent{&action.Configuration{
		RESTClientGetter: k8sAgent.RESTClientGetter,
		KubeClient:       kube.New(k8sAgent.RESTClientGetter),
		Releases:         StorageMap[form.Storage](l, clientset.CoreV1(), form.Namespace),
		Log:              l.Printf,
	}}, nil
}

// GetAgentTesting creates a new Agent using an optional existing storage class
func GetAgentTesting(form *Form, storage *storage.Storage, l *logger.Logger) *Agent {
	testStorage := storage

	if testStorage == nil {
		testStorage = StorageMap["memory"](nil, nil, "")
	}

	return &Agent{&action.Configuration{
		Releases: testStorage,
		KubeClient: &kubefake.FailingKubeClient{
			PrintingKubeClient: kubefake.PrintingKubeClient{
				Out: ioutil.Discard,
			},
		},
		Capabilities: chartutil.DefaultCapabilities,
		Log:          l.Printf,
	}}
}
