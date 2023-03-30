package kubernetes_test

import (
	"testing"

	"github.com/porter-dev/porter/internal/kubernetes"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type fakeRESTClientGetter struct{}

func (f *fakeRESTClientGetter) ToRESTConfig() (*rest.Config, error) {
	return nil, nil
}

func (f *fakeRESTClientGetter) ToRawKubeConfigLoader() clientcmd.ClientConfig {
	return nil
}

func (f *fakeRESTClientGetter) ToDiscoveryClient() (discovery.CachedDiscoveryInterface, error) {
	return nil, nil
}

func (f *fakeRESTClientGetter) ToRESTMapper() (meta.RESTMapper, error) {
	return nil, nil
}

func newAgentFixture(t *testing.T, objects ...runtime.Object) *kubernetes.Agent {
	t.Helper()

	return kubernetes.GetAgentTesting(objects...)
}

func TestOutOfClusterConfig(t *testing.T) {
	k8sAgent := newAgentFixture(t, &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: "test-namespace-0",
		},
	}, &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: "test-namespace-1",
		},
	})

	namespaces, err := k8sAgent.ListNamespaces()
	if err != nil {
		t.Fatalf(err.Error())
	}

	names := []string{"test-namespace-0", "test-namespace-1"}

	for i, ns := range namespaces.Items {
		if names[i] != ns.Name {
			t.Errorf("Namespace names do not match: expected %s, got %s\n", names[i], ns.Name)
		}
	}
}
