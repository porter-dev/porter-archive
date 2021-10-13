package repository

type Repository interface {
	User() UserRepository
	Project() ProjectRepository
	Release() ReleaseRepository
	Session() SessionRepository
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
	KubeIntegration() KubeIntegrationRepository
	BasicIntegration() BasicIntegrationRepository
	OIDCIntegration() OIDCIntegrationRepository
	OAuthIntegration() OAuthIntegrationRepository
	GCPIntegration() GCPIntegrationRepository
	AWSIntegration() AWSIntegrationRepository
	GithubAppInstallation() GithubAppInstallationRepository
	GithubAppOAuthIntegration() GithubAppOAuthIntegrationRepository
	SlackIntegration() SlackIntegrationRepository
	NotificationConfig() NotificationConfigRepository
	Event() EventRepository
	ProjectUsage() ProjectUsageRepository
}
