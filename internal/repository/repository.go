package repository

type Repository interface {
	User() UserRepository
	Project() ProjectRepository
	Release() ReleaseRepository
	GitRepo() GitRepoRepository
	Cluster() ClusterRepository
	HelmRepo() HelmRepoRepository
	Registry() RegistryRepository
	Infra() InfraRepository
	GitActionConfig() GitActionConfigRepository
	Invite() InviteRepository
	AuthCode() AuthCodeRepository
	DNSRecord() DNSRecordRepository
	PWResetToken() PWResetTokenRepository
	Session() SessionRepository
	KubeIntegration() KubeIntegrationRepository
	BasicIntegration() BasicIntegrationRepository
	OIDCIntegration() OIDCIntegrationRepository
	OAuthIntegration() OAuthIntegrationRepository
	GCPIntegration() GCPIntegrationRepository
	AWSIntegration() AWSIntegrationRepository
}
