package helm

import (
	"github.com/porter-dev/porter/internal/logger"

	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/kube"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// NewActionConfig creates an action.Configuration, which can then be used to create Helm 3 actions.
// Among other things, the action.Configuration controls which namespace the command is run against.
func NewActionConfig(
	l *logger.Logger,
	newStorageDriver NewStorageDriver,
	config *rest.Config,
	clientset *kubernetes.Clientset,
	namespace string,
) (*action.Configuration, error) {
	actionConfig := &action.Configuration{}
	store := newStorageDriver(l, namespace, clientset)
	restClientGetter := NewConfigFlagsFromCluster(namespace, config)
	actionConfig.RESTClientGetter = restClientGetter
	actionConfig.KubeClient = kube.New(restClientGetter)
	actionConfig.Releases = store
	actionConfig.Log = l.Printf
	return actionConfig, nil
}

// NewConfigFlagsFromCluster returns ConfigFlags with default values set from within cluster.
func NewConfigFlagsFromCluster(namespace string, clusterConfig *rest.Config) genericclioptions.RESTClientGetter {
	impersonateGroup := []string{}

	// CertFile and KeyFile must be nil for the BearerToken to be used for authentication and authorization instead of the pod's service account.
	return &genericclioptions.ConfigFlags{
		Insecure:         &clusterConfig.TLSClientConfig.Insecure,
		Timeout:          stringptr("0"),
		Namespace:        stringptr(namespace),
		APIServer:        stringptr(clusterConfig.Host),
		CAFile:           stringptr(clusterConfig.CAFile),
		BearerToken:      stringptr(clusterConfig.BearerToken),
		ImpersonateGroup: &impersonateGroup,
	}
}

func stringptr(val string) *string {
	return &val
}
