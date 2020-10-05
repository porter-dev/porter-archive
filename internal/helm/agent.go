package helm

import (
	"io/ioutil"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/logger"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/release"

	"helm.sh/helm/v3/pkg/chartutil"
	kubefake "helm.sh/helm/v3/pkg/kube/fake"
)

// Agent is a Helm agent for performing helm operations
type Agent struct {
	ActionConfig *action.Configuration
}

type HelmForm struct {
	KubeConfig      []byte   `form:"required"`
	AllowedContexts []string `form:"required"`
	Context         string   `json:"context" form:"required"`
	Storage         string   `json:"storage" form:"oneof=secret configmap memory"`
	Namespace       string   `json:"namespace"`
}

func (h *HelmForm) ToAgent(
	l *logger.Logger,
	testing bool,
) (*Agent, error) {
	if testing {
		return &Agent{&action.Configuration{
			Releases: StorageMap["memory"](l, h.Namespace, nil),
			KubeClient: &kubefake.FailingKubeClient{
				PrintingKubeClient: kubefake.PrintingKubeClient{
					Out: ioutil.Discard,
				},
			},
			Capabilities: chartutil.DefaultCapabilities,
			Log:          l.Printf,
		}}, nil
	}

	// create a client config using the app's helm/kubernetes agents
	conf, err := kubernetes.GetRestrictedClientConfigFromBytes(
		h.KubeConfig,
		h.Context,
		h.AllowedContexts,
	)

	if err != nil {
		return nil, err
	}

	restConf, err := conf.ClientConfig()

	clientset, err := kubernetes.GetClientsetFromConfig(conf)

	if err != nil {
		return nil, err
	}

	// create a new agent
	actionConfig, err := NewActionConfig(
		l,
		StorageMap[h.Storage],
		restConf,
		clientset,
		h.Namespace,
	)

	if err != nil {
		return nil, err
	}

	return &Agent{actionConfig}, nil
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
) (*release.Release, error) {
	// Namespace is already known by the RESTClientGetter.
	cmd := action.NewGet(a.ActionConfig)

	return cmd.Run(name)
}
