package repository

// Repository collects the repositories for each model
type Repository struct {
	User             UserRepository
	Project          ProjectRepository
	Release          ReleaseRepository
	Session          SessionRepository
	GitRepo          GitRepoRepository
	Cluster          ClusterRepository
	HelmRepo         HelmRepoRepository
	Registry         RegistryRepository
	Infra            InfraRepository
	GitActionConfig  GitActionConfigRepository
	Invite           InviteRepository
	AuthCode         AuthCodeRepository
	DNSRecord        DNSRecordRepository
	PWResetToken     PWResetTokenRepository
	KubeIntegration  KubeIntegrationRepository
	BasicIntegration BasicIntegrationRepository
	OIDCIntegration  OIDCIntegrationRepository
	OAuthIntegration OAuthIntegrationRepository
	GCPIntegration   GCPIntegrationRepository
	AWSIntegration   AWSIntegrationRepository
}
