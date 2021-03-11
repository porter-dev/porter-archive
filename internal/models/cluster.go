package models

import (
	"encoding/json"

	"github.com/porter-dev/porter/internal/models/integrations"
	"gorm.io/gorm"
)

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
	gorm.Model

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

	// A token cache that can be used by an auth mechanism, if desired
	TokenCache integrations.ClusterTokenCache `json:"token_cache"`

	// CertificateAuthorityData for the cluster, encrypted at rest
	CertificateAuthorityData []byte `json:"certificate-authority-data,omitempty"`
}

// ClusterExternal is an external Cluster to be shared over REST
type ClusterExternal struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// Name of the cluster
	Name string `json:"name"`

	// Server endpoint for the cluster
	Server string `json:"server"`

	// The integration service for this cluster
	Service integrations.IntegrationService `json:"service"`

	// The infra id, if cluster was provisioned with Porter
	InfraID uint `json:"infra_id"`
}

// Externalize generates an external Cluster to be shared over REST
func (c *Cluster) Externalize() *ClusterExternal {
	serv := integrations.Kube

	if c.AWSIntegrationID != 0 {
		serv = integrations.EKS
	} else if c.GCPIntegrationID != 0 {
		serv = integrations.GKE
	} else if c.DOIntegrationID != 0 {
		serv = integrations.DOKS
	}

	return &ClusterExternal{
		ID:        c.ID,
		ProjectID: c.ProjectID,
		Name:      c.Name,
		Server:    c.Server,
		Service:   serv,
		InfraID:   c.InfraID,
	}
}

// ClusterCandidate is a cluster integration that requires additional action
// from the user to set up.
type ClusterCandidate struct {
	gorm.Model

	// The auth mechanism that this candidate will parse for
	AuthMechanism ClusterAuth `json:"auth_mechanism"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// CreatedClusterID is the ID of the cluster that's eventually
	// created
	CreatedClusterID uint `json:"created_cluster_id"`

	// Resolvers are the list of resolvers: once all resolvers are "resolved," the
	// cluster will be created
	Resolvers []ClusterResolver `json:"resolvers"`

	// Name of the cluster
	Name string `json:"name"`

	// Server endpoint for the cluster
	Server string `json:"server"`

	// Name of the context that this was created from, if it exists
	ContextName string `json:"context_name"`

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	// The best-guess for the AWSClusterID, which is required by aws auth mechanisms
	// See https://github.com/kubernetes-sigs/aws-iam-authenticator#what-is-a-cluster-id
	AWSClusterIDGuess []byte `json:"aws_cluster_id_guess"`

	// The raw kubeconfig
	Kubeconfig []byte `json:"kubeconfig"`
}

// ClusterCandidateExternal represents the ClusterCandidate to be sent over REST
type ClusterCandidateExternal struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// CreatedClusterID is the ID of the cluster that's eventually
	// created
	CreatedClusterID uint `json:"created_cluster_id"`

	// Name of the cluster
	Name string `json:"name"`

	// Server endpoint for the cluster
	Server string `json:"server"`

	// Name of the context that this was created from, if it exists
	ContextName string `json:"context_name"`

	// Resolvers are the list of resolvers: once all resolvers are "resolved," the
	// cluster will be created
	Resolvers []ClusterResolverExternal `json:"resolvers"`

	// The best-guess for the AWSClusterID, which is required by aws auth mechanisms
	// See https://github.com/kubernetes-sigs/aws-iam-authenticator#what-is-a-cluster-id
	AWSClusterIDGuess string `json:"aws_cluster_id_guess"`
}

// Externalize generates an external ClusterCandidateExternal to be shared over REST
func (cc *ClusterCandidate) Externalize() *ClusterCandidateExternal {
	resolvers := make([]ClusterResolverExternal, 0)

	for _, resolver := range cc.Resolvers {
		resolvers = append(resolvers, *resolver.Externalize())
	}

	return &ClusterCandidateExternal{
		ID:                cc.ID,
		ProjectID:         cc.ProjectID,
		CreatedClusterID:  cc.CreatedClusterID,
		Name:              cc.Name,
		Server:            cc.Server,
		ContextName:       cc.ContextName,
		Resolvers:         resolvers,
		AWSClusterIDGuess: string(cc.AWSClusterIDGuess),
	}
}

// ClusterResolverName is the name for a cluster resolve
type ClusterResolverName string

// Options for the cluster resolver names
const (
	ClusterCAData    ClusterResolverName = "upload-cluster-ca-data"
	ClusterLocalhost                     = "rewrite-cluster-localhost"
	ClientCertData                       = "upload-client-cert-data"
	ClientKeyData                        = "upload-client-key-data"
	OIDCIssuerData                       = "upload-oidc-idp-issuer-ca-data"
	TokenData                            = "upload-token-data"
	GCPKeyData                           = "upload-gcp-key-data"
	AWSData                              = "upload-aws-data"
)

// ClusterResolverInfo contains the information for actions to be
// performed in order to initialize a cluster
type ClusterResolverInfo struct {
	// Docs is a link to documentation that helps resolve this manually
	Docs string `json:"docs"`

	// a comma-separated list of required fields to send in an action request
	Fields string `json:"fields"`
}

// ClusterResolverInfos is a map of the information for actions to be
// performed in order to initialize a cluster
var ClusterResolverInfos = map[ClusterResolverName]ClusterResolverInfo{
	ClusterCAData: ClusterResolverInfo{
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "cluster_ca_data",
	},
	ClusterLocalhost: ClusterResolverInfo{
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "cluster_hostname",
	},
	ClientCertData: ClusterResolverInfo{
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "client_cert_data",
	},
	ClientKeyData: ClusterResolverInfo{
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "client_key_data",
	},
	OIDCIssuerData: ClusterResolverInfo{
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "oidc_idp_issuer_ca_data",
	},
	TokenData: ClusterResolverInfo{
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "token_data",
	},
	GCPKeyData: ClusterResolverInfo{
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "gcp_key_data",
	},
	AWSData: ClusterResolverInfo{
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "aws_access_key_id,aws_secret_access_key,aws_cluster_id",
	},
}

// ClusterResolverAll is a helper type that contains the fields for
// all possible resolvers, so that raw bytes can be unmarshaled in a single
// read
type ClusterResolverAll struct {
	ClusterCAData      string `json:"cluster_ca_data,omitempty"`
	ClusterHostname    string `json:"cluster_hostname,omitempty"`
	ClientCertData     string `json:"client_cert_data,omitempty"`
	ClientKeyData      string `json:"client_key_data,omitempty"`
	OIDCIssuerCAData   string `json:"oidc_idp_issuer_ca_data,omitempty"`
	TokenData          string `json:"token_data,omitempty"`
	GCPKeyData         string `json:"gcp_key_data,omitempty"`
	AWSAccessKeyID     string `json:"aws_access_key_id"`
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
	AWSClusterID       string `json:"aws_cluster_id"`
}

// ClusterResolver is an action that must be resolved to set up
// a Cluster
type ClusterResolver struct {
	gorm.Model

	// The ClusterCandidate that this is resolving
	ClusterCandidateID uint `json:"cluster_candidate_id"`

	// One of the ClusterResolverNames
	Name ClusterResolverName `json:"name"`

	// Resolved is true if this has been resolved, false otherwise
	Resolved bool `json:"resolved"`

	// Data is additional data for resolving the action, for example a file name,
	// context name, etc
	Data []byte `json:"data,omitempty"`
}

// ClusterResolverData is a map of key names to fields, which gets marshaled from
// the raw JSON bytes stored in the ClusterResolver
type ClusterResolverData map[string]string

// ClusterResolverExternal is an external ClusterResolver to be shared over REST
type ClusterResolverExternal struct {
	ID uint `json:"id"`

	// The ClusterCandidate that this is resolving
	ClusterCandidateID uint `json:"cluster_candidate_id"`

	// One of the ClusterResolverNames
	Name ClusterResolverName `json:"name"`

	// Resolved is true if this has been resolved, false otherwise
	Resolved bool `json:"resolved"`

	// Docs is a link to documentation that helps resolve this manually
	Docs string `json:"docs"`

	// Fields is a list of fields that must be sent with the resolving request
	Fields string `json:"fields"`

	// Data is additional data for resolving the action, for example a file name,
	// context name, etc
	Data ClusterResolverData `json:"data,omitempty"`
}

// Externalize generates an external ClusterResolver to be shared over REST
func (cr *ClusterResolver) Externalize() *ClusterResolverExternal {
	info := ClusterResolverInfos[cr.Name]

	data := make(ClusterResolverData)

	json.Unmarshal(cr.Data, &data)

	return &ClusterResolverExternal{
		ID:                 cr.ID,
		ClusterCandidateID: cr.ClusterCandidateID,
		Name:               cr.Name,
		Resolved:           cr.Resolved,
		Docs:               info.Docs,
		Fields:             info.Fields,
		Data:               data,
	}
}
