package helm_test

import (
	"reflect"
	"testing"

	"github.com/stefanmcshane/helm/pkg/chart"
	"github.com/stefanmcshane/helm/pkg/release"

	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/pkg/logger"
	"github.com/stefanmcshane/helm/pkg/storage"
	"k8s.io/client-go/kubernetes/fake"
)

func testDriver(t *testing.T, storage *storage.Storage) {
	t.Helper()

	rel := &release.Release{
		Name:      "porter",
		Namespace: "default",
		Version:   1,
		Info: &release.Info{
			Status: release.StatusDeployed,
		},
		Chart: &chart.Chart{
			Metadata: &chart.Metadata{
				Version: "1.0.0",
				Icon:    "https://example.com/icon.png",
			},
		},
	}

	err := storage.Create(rel)
	if err != nil {
		t.Fatal(err)
	}

	gotRel, err := storage.Get("porter", 1)
	if err != nil {
		t.Fatal(err)
	}

	if !reflect.DeepEqual(rel, gotRel) {
		t.Fatalf("Objects not equal: expected %v, got %v\n", rel, gotRel)
	}
}

func testStorageDriver(t *testing.T, name string) {
	t.Helper()

	k8sAgent := kubernetes.GetAgentTesting()

	newDriver := helm.StorageMap[name]

	l := logger.NewConsole(true)

	clientset, ok := k8sAgent.Clientset.(*fake.Clientset)

	if !ok {
		t.Fatal("Agent Clientset was not of type *(k8s.io/client-go/kubernetes/fake).Clientset")
	}

	driver := newDriver(l, clientset.CoreV1(), "default")

	testDriver(t, driver)
}

func TestNewSecretStorageDriver(t *testing.T) {
	testStorageDriver(t, "secret")
}

func TestNewConfigMapStorageDriver(t *testing.T) {
	testStorageDriver(t, "configmap")
}

func TestNewMemoryStorageDriver(t *testing.T) {
	testStorageDriver(t, "memory")
}
