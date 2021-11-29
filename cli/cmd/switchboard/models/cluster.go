package models

// ClusterAuth is an auth mechanism that a cluster candidate can resolve
type ClusterAuth string

// The support cluster candidate auth mechanisms
const (
	X509   ClusterAuth = "x509"
	Basic  ClusterAuth = "basic"
	Bearer ClusterAuth = "bearerToken"
	OIDC   ClusterAuth = "oidc"
	GCP    ClusterAuth = "gcp-sa"
	AWS    ClusterAuth = "aws-sa"
	DO     ClusterAuth = "do-oauth"
	Local  ClusterAuth = "local"
)

// Cluster is an integration that can connect to a Kubernetes cluster via
// a specific auth mechanism
type Cluster struct {
	// The auth mechanism that this cluster will use
	AuthMechanism ClusterAuth `json:"auth_mechanism"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// Name of the cluster
	Name string `json:"name"`

	// Server endpoint for the cluster
	Server string `json:"server"`

	// Additional fields optionally used by the kube client
	ClusterLocationOfOrigin string `json:"location_of_origin,omitempty"`
	TLSServerName           string `json:"tls-server-name,omitempty"`
	InsecureSkipTLSVerify   bool   `json:"insecure-skip-tls-verify,omitempty"`
	ProxyURL                string `json:"proxy-url,omitempty"`
	UserLocationOfOrigin    string
	UserImpersonate         string `json:"act-as,omitempty"`
	UserImpersonateGroups   string `json:"act-as-groups,omitempty"`

	InfraID uint `json:"infra_id"`

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	// The various auth mechanisms available to the integration
	KubeIntegrationID uint
	OIDCIntegrationID uint
	GCPIntegrationID  uint
	AWSIntegrationID  uint
	DOIntegrationID   uint

	// CertificateAuthorityData for the cluster, encrypted at rest
	CertificateAuthorityData []byte `json:"certificate-authority-data,omitempty"`
}
