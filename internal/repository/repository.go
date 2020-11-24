package repository

// Repository collects the repositories for each model
type Repository struct {
	User             UserRepository
	Project          ProjectRepository
	Session          SessionRepository
	GitRepo          GitRepoRepository
	Cluster          ClusterRepository
	Registry         RegistryRepository
	KubeIntegration  KubeIntegrationRepository
	OIDCIntegration  OIDCIntegrationRepository
	OAuthIntegration OAuthIntegrationRepository
	GCPIntegration   GCPIntegrationRepository
	AWSIntegration   AWSIntegrationRepository
}
