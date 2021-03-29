package helm

import (
	"errors"
	"io/ioutil"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/oauth2"
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
	Cluster           *models.Cluster `form:"required"`
	Repo              *repository.Repository
	DigitalOceanOAuth *oauth2.Config
	Storage           string `json:"storage" form:"oneof=secret configmap memory" default:"secret"`
	Namespace         string `json:"namespace"`
}

// GetAgentOutOfClusterConfig creates a new Agent from outside the cluster using
// the underlying kubernetes.GetAgentOutOfClusterConfig method
func GetAgentOutOfClusterConfig(form *Form, l *logger.Logger) (*Agent, error) {
	// create a kubernetes agent
	conf := &kubernetes.OutOfClusterConfig{
		Cluster:           form.Cluster,
		DefaultNamespace:  form.Namespace,
		Repo:              form.Repo,
		DigitalOceanOAuth: form.DigitalOceanOAuth,
	}

	k8sAgent, err := kubernetes.GetAgentOutOfClusterConfig(conf)

	if err != nil {
		return nil, err
	}

	return GetAgentFromK8sAgent(form.Storage, form.Namespace, l, k8sAgent)
}

// GetAgentFromK8sAgent creates a new Agent
func GetAgentFromK8sAgent(stg string, ns string, l *logger.Logger, k8sAgent *kubernetes.Agent) (*Agent, error) {
	// clientset, ok := k8sAgent.Clientset.(*k8s.Clientset)

	// if !ok {
	// 	return nil, errors.New("Agent Clientset was not of type *(k8s.io/client-go/kubernetes).Clientset")
	// }

	// actionConf := &action.Configuration{
	// 	RESTClientGetter: k8sAgent.RESTClientGetter,
	// 	KubeClient:       kube.New(k8sAgent.RESTClientGetter),
	// 	Releases:         StorageMap[stg](l, clientset.CoreV1(), ns),
	// 	Log:              l.Printf,
	// }

	actionConf := &action.Configuration{}

	if err := actionConf.Init(k8sAgent.RESTClientGetter, ns, stg, l.Printf); err != nil {
		return nil, err
	}

	// use k8s agent to create Helm agent
	return &Agent{
		ActionConfig: actionConf,
		K8sAgent:     k8sAgent,
	}, nil
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
	return &Agent{
		ActionConfig: &action.Configuration{
			RESTClientGetter: k8sAgent.RESTClientGetter,
			KubeClient:       kube.New(k8sAgent.RESTClientGetter),
			Releases:         StorageMap[form.Storage](l, clientset.CoreV1(), form.Namespace),
			Log:              l.Printf,
		},
		K8sAgent: k8sAgent,
	}, nil
}

// GetAgentTesting creates a new Agent using an optional existing storage class
func GetAgentTesting(form *Form, storage *storage.Storage, l *logger.Logger) *Agent {
	testStorage := storage

	if testStorage == nil {
		testStorage = StorageMap["memory"](nil, nil, "")
	}

	return &Agent{
		ActionConfig: &action.Configuration{
			Releases: testStorage,
			KubeClient: &kubefake.FailingKubeClient{
				PrintingKubeClient: kubefake.PrintingKubeClient{
					Out: ioutil.Discard,
				},
			},
			Capabilities: chartutil.DefaultCapabilities,
			Log:          l.Printf,
		},
	}
}
