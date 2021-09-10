package integrations

import "gorm.io/gorm"

// KubeIntegrationName is the name of a kube auth mechanism
type KubeIntegrationName string

// The supported kube auth mechanisms
const (
	KubeX509   KubeIntegrationName = "x509"
	KubeBasic                      = "basic"
	KubeBearer                     = "bearer"
	KubeLocal                      = "local"
)

// KubeIntegration represents the kube-native auth mechanisms: using x509 certs,
// basic (username/password), bearer tokens, or local (using local kubeconfig)
type KubeIntegration struct {
	gorm.Model

	// The name of the auth mechanism
	Mechanism KubeIntegrationName `json:"mechanism"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// ------------------------------------------------------------------
	// All fields encrypted before storage.
	// ------------------------------------------------------------------

	// Certificate data is used by x509 auth mechanisms over TLS
	ClientCertificateData []byte `json:"client-certificate-data,omitempty"`
	ClientKeyData         []byte `json:"client-key-data,omitempty"`

	// Token is used for bearer-token auth mechanisms
	Token []byte `json:"token,omitempty"`

	// Username/Password for basic authentication to a cluster
	Username []byte `json:"username,omitempty"`
	Password []byte `json:"password,omitempty"`

	// The raw kubeconfig, used by local auth mechanisms
	Kubeconfig []byte `json:"kubeconfig"`
}
