package models

import (
	"gorm.io/gorm"
)

// Supported auth mechanisms
const (
	X509         string = "x509"
	Basic               = "basic"
	Bearer              = "bearerToken"
	OIDC                = "oidc"
	GCP                 = "gcp-sa"
	AWS                 = "aws-sa"
	NotAvailable        = "n/a"
)

// ServiceAccountCandidate is a service account that requires an action
// from the user to set up.
type ServiceAccountCandidate struct {
	gorm.Model

	ProjectID uint   `json:"project_id"`
	Kind      string `json:"kind"`

	Actions []ServiceAccountAction `json:"actions"`

	ContextName     string `json:"context_name"`
	ClusterName     string `json:"cluster_name"`
	ClusterEndpoint string `json:"cluster_endpoint"`
	AuthMechanism   string `json:"auth_mechanism"`

	// CreatedServiceAccountID is the ID of the service account that's eventually
	// created
	CreatedServiceAccountID uint `json:"create_sa_id"`

	// The best-guess for the AWSClusterID, which is required by aws auth mechanisms
	// See https://github.com/kubernetes-sigs/aws-iam-authenticator#what-is-a-cluster-id
	AWSClusterIDGuess string `json:"aws_cluster_id_guess"`

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	Kubeconfig []byte `json:"kubeconfig"`
}

// ServiceAccountCandidateExternal represents the ServiceAccountCandidate type that is
// sent over REST
type ServiceAccountCandidateExternal struct {
	ID                      uint                           `json:"id"`
	Actions                 []ServiceAccountActionExternal `json:"actions"`
	ProjectID               uint                           `json:"project_id"`
	Kind                    string                         `json:"kind"`
	ContextName             string                         `json:"context_name"`
	ClusterName             string                         `json:"cluster_name"`
	ClusterEndpoint         string                         `json:"cluster_endpoint"`
	AuthMechanism           string                         `json:"auth_mechanism"`
	CreatedServiceAccountID uint                           `json:"created_sa_id"`
	AWSClusterIDGuess       string                         `json:"aws_cluster_id_guess"`
}

// Externalize generates an external ServiceAccountCandidate to be shared over REST
func (s *ServiceAccountCandidate) Externalize() *ServiceAccountCandidateExternal {
	actions := make([]ServiceAccountActionExternal, 0)

	for _, action := range s.Actions {
		actions = append(actions, *action.Externalize())
	}

	return &ServiceAccountCandidateExternal{
		ID:                      s.ID,
		Actions:                 actions,
		ProjectID:               s.ProjectID,
		Kind:                    s.Kind,
		ContextName:             s.ContextName,
		ClusterName:             s.ClusterName,
		ClusterEndpoint:         s.ClusterEndpoint,
		AuthMechanism:           s.AuthMechanism,
		CreatedServiceAccountID: s.CreatedServiceAccountID,
		AWSClusterIDGuess:       s.AWSClusterIDGuess,
	}
}

// ServiceAccount type that extends gorm.Model
type ServiceAccount struct {
	gorm.Model

	ProjectID uint `json:"project_id"`

	// Kind can either be "connector" or "provisioner"
	Kind string `json:"kind"`

	// Clusters is a list of clusters that this ServiceAccount can connect
	// to or has provisioned
	Clusters []Cluster `json:"clusters"`

	// AuthMechanism is the strategy used for either connecting to or provisioning
	// the cluster. Supported mechanisms are: basic,x509,bearerToken,oidc,gcp-sa,aws-sa
	AuthMechanism string `json:"auth_mechanism"`

	// These fields are used by all auth mechanisms
	LocationOfOrigin  string
	Impersonate       string `json:"act-as,omitempty"`
	ImpersonateGroups string `json:"act-as-groups,omitempty"`

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	// Certificate data is used by x509 auth mechanisms over TLS
	ClientCertificateData []byte `json:"client-certificate-data,omitempty"`
	ClientKeyData         []byte `json:"client-key-data,omitempty"`

	// Token is used for bearer-token auth mechanisms
	Token string `json:"token,omitempty"`

	// Username/Password for basic authentication to a cluster
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`

	// TokenCache is a cache for bearer tokens with an expiry time
	// Used by GCP and AWS mechanisms
	TokenCache TokenCache `json:"token_cache"`

	// KeyData for a service account for GCP connectors
	GCPKeyData []byte `json:"gcp_key_data"`

	// AWS data
	AWSAccessKeyID     string `json:"aws_access_key_id"`
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
	AWSClusterID       string `json:"aws_cluster_id"`

	// OIDC-related fields
	OIDCIssuerURL                string `json:"idp-issuer-url"`
	OIDCClientID                 string `json:"client-id"`
	OIDCClientSecret             string `json:"client-secret"`
	OIDCCertificateAuthorityData string `json:"idp-certificate-authority-data"`
	OIDCIDToken                  string `json:"id-token"`
	OIDCRefreshToken             string `json:"refresh-token"`
}

// ServiceAccountExternal is an external ServiceAccount to be shared over REST
type ServiceAccountExternal struct {
	ID            uint              `json:"id"`
	ProjectID     uint              `json:"project_id"`
	Kind          string            `json:"kind"`
	Clusters      []ClusterExternal `json:"clusters"`
	AuthMechanism string            `json:"auth_mechanism"`
}

// Externalize generates an external ServiceAccount to be shared over REST
func (s *ServiceAccount) Externalize() *ServiceAccountExternal {
	clusters := make([]ClusterExternal, 0)

	for _, cluster := range s.Clusters {
		clusters = append(clusters, *cluster.Externalize())
	}

	return &ServiceAccountExternal{
		ID:            s.ID,
		ProjectID:     s.ProjectID,
		Kind:          s.Kind,
		Clusters:      clusters,
		AuthMechanism: s.AuthMechanism,
	}
}
