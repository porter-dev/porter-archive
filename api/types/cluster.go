package types

import v1 "k8s.io/api/core/v1"

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

	// The infra id, if cluster was provisioned with Porter
	InfraID uint `json:"infra_id"`

	// (optional) The aws integration id, if available
	AWSIntegrationID uint `json:"aws_integration_id"`
}

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
)

type ClusterListNamespacesResponse struct {
	*v1.NamespaceList
}
