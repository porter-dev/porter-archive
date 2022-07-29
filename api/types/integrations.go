package types

// PorterIntegration is a supported integration service, specifying an auth
// mechanism and the category of integration. A single service can have multiple
// auth mechanisms. For example, a GKE integration can have both an "oauth" mechanism
// and a "gcp" mechanism:
//
// PorterIntegration{
// 	AuthMechanism: "oauth",
// 	Category: "cluster",
// 	Service: GKE,
// }
//
// PorterIntegration{
// 	AuthMechanism: "gcp",
// 	Category: "cluster",
// 	Service: GKE,
// }
type PorterIntegration struct {
	AuthMechanism string `json:"auth_mechanism"`
	Category      string `json:"category"`
	Service       string `json:"service"`
}

// PorterClusterIntegrations are the supported cluster integrations
var PorterClusterIntegrations = []PorterIntegration{
	{
		AuthMechanism: "gcp",
		Category:      "cluster",
		Service:       string(GKE),
	},
	{
		AuthMechanism: "aws",
		Category:      "cluster",
		Service:       string(EKS),
	},
	{
		AuthMechanism: "kube",
		Category:      "cluster",
		Service:       string(Kube),
	},
}

// PorterRegistryIntegrations are the supported registry integrations
var PorterRegistryIntegrations = []PorterIntegration{
	{
		AuthMechanism: "gcp",
		Category:      "registry",
		Service:       string(GCR),
	},
	{
		AuthMechanism: "gcp",
		Category:      "registry",
		Service:       string(GAR),
	},
	{
		AuthMechanism: "aws",
		Category:      "registry",
		Service:       string(ECR),
	},
	{
		AuthMechanism: "basic",
		Category:      "registry",
		Service:       string(DockerHub),
	},
}

// PorterHelmRepoIntegrations are the supported helm repo integrations
var PorterHelmRepoIntegrations = []PorterIntegration{
	{
		AuthMechanism: "basic",
		Category:      "helm",
		Service:       "helmrepo",
	},
}
