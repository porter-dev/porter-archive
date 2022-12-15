package helm

// Helm contains support for several different storage drivers.
//
// This includes (as of October 2020):
// - configmap
// - secret
// - memory
// - postgres
//
// This file implements first-class support for the first three driver types
// and integrates with the logger.
//
// TODO -- include support for SQL storage...

import (
	"github.com/porter-dev/porter/pkg/logger"

	"github.com/stefanmcshane/helm/pkg/storage"
	"github.com/stefanmcshane/helm/pkg/storage/driver"
	corev1 "k8s.io/client-go/kubernetes/typed/core/v1"
)

// NewStorageDriver is a function type for returning a new storage driver
type NewStorageDriver func(
	l *logger.Logger,
	v1Interface corev1.CoreV1Interface,
	namespace string,
) *storage.Storage

// StorageMap is a map from storage configuration env variables to a function
// that initializes that Helm storage driver.
var StorageMap map[string]NewStorageDriver = map[string]NewStorageDriver{
	"secret":    newSecretStorageDriver,
	"configmap": newConfigMapsStorageDriver,
	"memory":    newMemoryStorageDriver,
}

// NewSecretStorageDriver returns a storage using the Secret driver.
func newSecretStorageDriver(
	l *logger.Logger,
	v1Interface corev1.CoreV1Interface,
	namespace string,
) *storage.Storage {
	d := driver.NewSecrets(v1Interface.Secrets(namespace))
	d.Log = l.Printf
	return storage.Init(d)
}

// NewConfigMapsStorageDriver returns a storage using the ConfigMap driver.
func newConfigMapsStorageDriver(
	l *logger.Logger,
	v1Interface corev1.CoreV1Interface,
	namespace string,
) *storage.Storage {
	d := driver.NewConfigMaps(v1Interface.ConfigMaps(namespace))
	d.Log = l.Printf
	return storage.Init(d)
}

// NewMemoryStorageDriver returns a storage using the In-Memory driver.
func newMemoryStorageDriver(
	_ *logger.Logger,
	_ corev1.CoreV1Interface,
	_ string,
) *storage.Storage {
	d := driver.NewMemory()
	return storage.Init(d)
}
