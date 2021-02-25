package integrations

// IntegrationService is the name of a third-party service
type IntegrationService string

// The list of supported third-party services
const (
	GKE       IntegrationService = "gke"
	DOKS      IntegrationService = "doks"
	GCS       IntegrationService = "gcs"
	S3        IntegrationService = "s3"
	HelmRepo  IntegrationService = "helm"
	EKS       IntegrationService = "eks"
	Kube      IntegrationService = "kube"
	GCR       IntegrationService = "gcr"
	ECR       IntegrationService = "ecr"
	DOCR      IntegrationService = "docr"
	Github    IntegrationService = "github"
	DockerHub IntegrationService = "dockerhub"
	Docker    IntegrationService = "docker"
)

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
	AuthMechanism string             `json:"auth_mechanism"`
	Category      string             `json:"category"`
	Service       IntegrationService `json:"service"`
}

// PorterClusterIntegrations are the supported cluster integrations
var PorterClusterIntegrations = []PorterIntegration{
	PorterIntegration{
		AuthMechanism: "gcp",
		Category:      "cluster",
		Service:       GKE,
	},
	PorterIntegration{
		AuthMechanism: "aws",
		Category:      "cluster",
		Service:       EKS,
	},
	PorterIntegration{
		AuthMechanism: "kube",
		Category:      "cluster",
		Service:       Kube,
	},
}

// PorterRegistryIntegrations are the supported registry integrations
var PorterRegistryIntegrations = []PorterIntegration{
	PorterIntegration{
		AuthMechanism: "gcp",
		Category:      "registry",
		Service:       GCR,
	},
	PorterIntegration{
		AuthMechanism: "aws",
		Category:      "registry",
		Service:       ECR,
	},
	PorterIntegration{
		AuthMechanism: "oauth",
		Category:      "registry",
		Service:       Docker,
	},
}

// PorterHelmRepoIntegrations are the supported helm repo integrations
var PorterHelmRepoIntegrations = []PorterIntegration{
	PorterIntegration{
		AuthMechanism: "basic",
		Category:      "helm",
		Service:       HelmRepo,
	},
	PorterIntegration{
		AuthMechanism: "gcp",
		Category:      "helm",
		Service:       GCS,
	},
	PorterIntegration{
		AuthMechanism: "aws",
		Category:      "helm",
		Service:       S3,
	},
}

// PorterGitRepoIntegrations are the supported git repo integrations
var PorterGitRepoIntegrations = []PorterIntegration{
	PorterIntegration{
		AuthMechanism: "oauth",
		Category:      "repo",
		Service:       Github,
	},
}

// ProjectIntegration is the top-level integration object for various integrations.
// Although the integrations are stored in the DB by auth mechanism, the integrations
// are cast to a ProjectIntegration for consolidation before passing on to the client.
type ProjectIntegration struct {
	ID        uint `json:"id"`
	ProjectID uint `json:"project_id"`

	AuthMechanism string             `json:"auth_mechanism"`
	Category      string             `json:"category"`
	Service       IntegrationService `json:"service"`
}
