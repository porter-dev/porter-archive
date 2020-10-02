package helm

// Helm contains support for several different storage drivers.
//
// This includes (as of October 2020):
// - configmap
// - secret
// - memory
// - postgres
//
// This file implements first-class support for each driver type, and integrates with the
// logger.

import (
	"github.com/porter-dev/porter/internal/logger"

	"helm.sh/helm/v3/pkg/storage"
	"helm.sh/helm/v3/pkg/storage/driver"
	"k8s.io/client-go/kubernetes"
)

// NewStorageDriver is a function type for returning a new storage driver
type NewStorageDriver func(l *logger.Logger, namespace string, clientset *kubernetes.Clientset) *storage.Storage

// NewSecretStorageDriver returns a storage using the Secret driver.
func NewSecretStorageDriver(
	l *logger.Logger,
	namespace string,
	clientset *kubernetes.Clientset,
) *storage.Storage {
	d := driver.NewSecrets(clientset.CoreV1().Secrets(namespace))
	d.Log = l.Printf
	return storage.Init(d)
}

// NewConfigMapsStorageDriver returns a storage using the ConfigMap driver.
func NewConfigMapsStorageDriver(
	l *logger.Logger,
	namespace string,
	clientset *kubernetes.Clientset,
) *storage.Storage {
	d := driver.NewConfigMaps(clientset.CoreV1().ConfigMaps(namespace))
	d.Log = l.Printf
	return storage.Init(d)
}

// NewMemoryStorageDriver returns a storage using the In-Memory driver.
func NewMemoryStorageDriver(
	l *logger.Logger,
	namespace string,
	clientset *kubernetes.Clientset,
) *storage.Storage {
	d := driver.NewMemory()
	return storage.Init(d)
}
