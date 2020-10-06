package helm

import (
	"io/ioutil"

	"github.com/porter-dev/porter/internal/config"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/logger"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/kube"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/storage"

	"helm.sh/helm/v3/pkg/chartutil"
	kubefake "helm.sh/helm/v3/pkg/kube/fake"
)

// Agent is a Helm agent for performing helm operations
type Agent struct {
	ActionConfig *action.Configuration
}

// Form represents the options for connecting to a cluster and
// creating a Helm agent
type Form struct {
	KubeConfig      []byte
	AllowedContexts []string
	Context         string `json:"context" form:"required"`
	Storage         string `json:"storage" form:"oneof=secret configmap memory"`
	Namespace       string `json:"namespace"`
}

// ToAgent uses the Form to generate an agent. Setting testing=true will create
// a test agent with in-memory storage
func (h *Form) ToAgent(
	l *logger.Logger,
	helmConf *config.HelmGlobalConf,
	storage *storage.Storage,
) (*Agent, error) {
	if helmConf.IsTesting {
		testStorage := storage

		if testStorage == nil {
			testStorage = StorageMap["memory"](nil, h.Namespace, nil)
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
		}}, nil
	}

	// create a kubernetes agent
	k8sForm := &kubernetes.Form{
		KubeConfig:      h.KubeConfig,
		AllowedContexts: h.AllowedContexts,
		Context:         h.Context,
	}

	k8sAgent, err := k8sForm.ToAgent()

	if err != nil {
		return nil, err
	}

	// use k8s agent to create Helm agent
	return &Agent{&action.Configuration{
		RESTClientGetter: k8sAgent.RESTClientGetter,
		KubeClient:       kube.New(k8sAgent.RESTClientGetter),
		Releases:         StorageMap[h.Storage](l, h.Namespace, k8sAgent.Clientset),
		Log:              l.Printf,
	}}, nil
}

// ListReleases lists releases based on a ListFilter
func (a *Agent) ListReleases(
	namespace string,
	filter *ListFilter,
) ([]*release.Release, error) {
	cmd := action.NewList(a.ActionConfig)

	filter.apply(cmd)

	return cmd.Run()
}

// GetRelease returns the info of a release.
func (a *Agent) GetRelease(
	name string,
	version int,
) (*release.Release, error) {
	// Namespace is already known by the RESTClientGetter.
	cmd := action.NewGet(a.ActionConfig)

	cmd.Version = version

	return cmd.Run(name)
}
