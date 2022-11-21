package types

import (
	"github.com/porter-dev/porter/internal/kubernetes/prometheus"
)

const (
	URLParamCandidateID URLParam = "candidate_id"
	URLParamNodeName    URLParam = "node_name"
)

type Cluster struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// Name of the cluster
	Name string `json:"name"`

	// Server endpoint for the cluster
	Server string `json:"server"`

	// The integration service for this cluster
	Service ClusterService `json:"service"`

	// Whether or not the Porter agent integration is enabled
	AgentIntegrationEnabled bool `json:"agent_integration_enabled"`

	// The infra id, if cluster was provisioned with Porter
	InfraID uint `json:"infra_id"`

	// (optional) The aws integration id, if available
	AWSIntegrationID uint `json:"aws_integration_id"`

	// (optional) The aws cluster id, if available
	AWSClusterID string `json:"aws_cluster_id,omitempty"`

	// Whether preview environments is enabled on this cluster
	PreviewEnvsEnabled bool `json:"preview_envs_enabled"`
}

type ClusterCandidate struct {
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
	Resolvers []ClusterResolver `json:"resolvers"`

	// The best-guess for the AWSClusterID, which is required by aws auth mechanisms
	// See https://github.com/kubernetes-sigs/aws-iam-authenticator#what-is-a-cluster-id
	AWSClusterIDGuess string `json:"aws_cluster_id_guess"`
}

type ClusterResolver struct {
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
	ClusterCAData: {
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "cluster_ca_data",
	},
	ClusterLocalhost: {
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "cluster_hostname",
	},
	ClientCertData: {
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "client_cert_data",
	},
	ClientKeyData: {
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "client_key_data",
	},
	OIDCIssuerData: {
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "oidc_idp_issuer_ca_data",
	},
	TokenData: {
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "token_data",
	},
	GCPKeyData: {
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "gcp_key_data",
	},
	AWSData: {
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "aws_access_key_id,aws_secret_access_key,aws_cluster_id",
	},
}

// ClusterResolverData is a map of key names to fields, which gets marshaled from
// the raw JSON bytes stored in the ClusterResolver
type ClusterResolverData map[string]string

type ClusterGetResponse struct {
	*Cluster

	// The NGINX Ingress IP to access the cluster
	IngressIP string `json:"ingress_ip"`

	// Error displayed in case couldn't get the IP
	IngressError error `json:"ingress_error"`
}

type ClusterService string

const (
	EKS  ClusterService = "eks"
	DOKS ClusterService = "doks"
	GKE  ClusterService = "gke"
	Kube ClusterService = "kube"
	AKS  ClusterService = "aks"
)

// ClusterResolverName is the name for a cluster resolve
type ClusterResolverName string

// Options for the cluster resolver names
const (
	ClusterCAData    ClusterResolverName = "upload-cluster-ca-data"
	ClusterLocalhost ClusterResolverName = "rewrite-cluster-localhost"
	ClientCertData   ClusterResolverName = "upload-client-cert-data"
	ClientKeyData    ClusterResolverName = "upload-client-key-data"
	OIDCIssuerData   ClusterResolverName = "upload-oidc-idp-issuer-ca-data"
	TokenData        ClusterResolverName = "upload-token-data"
	GCPKeyData       ClusterResolverName = "upload-gcp-key-data"
	AWSData          ClusterResolverName = "upload-aws-data"
)

// NamespaceResponse represents the response type of requests to the namespace resource
//
// swagger:model
type NamespaceResponse struct {
	// the name of the namespace
	// example: default
	Name string `json:"name" form:"required"`

	// the creation timestamp in UTC of the namespace in RFC 1123 format
	// example: Mon, 13 Jun 2022 17:49:12 GMT
	CreationTimestamp string `json:"creationTimestamp" form:"required"`

	// the deletion timestamp in UTC of the namespace in RFC 1123 format, if the namespace is deleted
	// example: Mon, 13 Jun 2022 17:49:12 GMT
	DeletionTimestamp string `json:"deletionTimestamp,omitempty"`

	// the status of the namespace
	// enum: active,terminating
	// example: active
	Status string `json:"status" form:"required"`
}

// ListNamespacesResponse represents the list of all namespaces
//
// swagger:model
type ListNamespacesResponse []*NamespaceResponse

// CreateNamespaceRequest represents the request body to create a namespace
//
// swagger:model
type CreateNamespaceRequest struct {
	// the name of the namespace to create
	// example: sampleNS
	Name string `json:"name" form:"required"`

	// labels for the kubernetes namespace, if any
	Labels map[string]string `json:"labels,omitempty"`
}

type GetTemporaryKubeconfigResponse struct {
	Kubeconfig []byte `json:"kubeconfig"`
}

type ListNGINXIngressesResponse []prometheus.SimpleIngress

type GetPodMetricsRequest struct {
	prometheus.QueryOpts
}

type GetPodMetricsResponse *string

type GetPodsRequest struct {
	Namespace string   `schema:"namespace"`
	Selectors []string `schema:"selectors"`
}

type CreateClusterManualRequest struct {
	Name      string `json:"name" form:"required"`
	ProjectID uint   `json:"project_id" form:"required"`
	Server    string `json:"server" form:"required"`

	GCPIntegrationID uint `json:"gcp_integration_id"`
	AWSIntegrationID uint `json:"aws_integration_id"`

	CertificateAuthorityData string `json:"certificate_authority_data,omitempty"`
}

type CreateClusterCandidateRequest struct {
	ProjectID  uint   `json:"project_id"`
	Kubeconfig string `json:"kubeconfig"`

	// Represents whether the auth mechanism should be designated as
	// "local": if so, the auth mechanism uses local plugins/mechanisms purely from the
	// kubeconfig.
	IsLocal bool `json:"is_local"`
}

type UpdateClusterRequest struct {
	Name string `json:"name"`

	AWSClusterID string `json:"aws_cluster_id"`

	AgentIntegrationEnabled *bool `json:"agent_integration_enabled"`

	PreviewEnvsEnabled *bool `json:"preview_envs_enabled"`
}

type ListClusterResponse []*Cluster

type CreateClusterCandidateResponse []*ClusterCandidate

type ListClusterCandidateResponse []*ClusterCandidate
