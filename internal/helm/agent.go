package helm

import (
	"github.com/porter-dev/porter/internal/logger"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/release"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// Agent is a Helm agent for performing helm operations
type Agent interface {
	ListReleases(namespace string, filter *ListFilter) ([]*release.Release, error)
	GetRelease(name string) (*release.Release, error)
}

// DefaultAgent implements Agent using Helm's action.Configuration
type DefaultAgent struct {
	actionConfig *action.Configuration
}

// NewDefaultAgent creates a new implementation of Agent
func NewDefaultAgent(
	l *logger.Logger,
	storage string,
	namespace string,
	config *rest.Config,
	clientset *kubernetes.Clientset,
) (*DefaultAgent, error) {
	// get the storage driver
	storageDriver := StorageMap[storage]

	// create the action config
	actionConfig, err := NewActionConfig(l, storageDriver, config, clientset, namespace)

	if err != nil {
		return nil, err
	}

	return &DefaultAgent{actionConfig}, nil
}

// ListReleases lists releases based on a ListFilter
func (a *DefaultAgent) ListReleases(
	namespace string,
	filter *ListFilter,
) ([]*release.Release, error) {
	cmd := action.NewList(a.actionConfig)

	filter.apply(cmd)

	return cmd.Run()
}

// GetRelease returns the info of a release.
func (a *DefaultAgent) GetRelease(
	name string,
) (*release.Release, error) {
	// Namespace is already known by the RESTClientGetter.
	cmd := action.NewGet(a.actionConfig)

	return cmd.Run(name)
}
