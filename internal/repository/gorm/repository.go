package gorm

import (
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/credentials"
	"gorm.io/gorm"
)

type GormRepository struct {
	user                      repository.UserRepository
	session                   repository.SessionRepository
	project                   repository.ProjectRepository
	cluster                   repository.ClusterRepository
	database                  repository.DatabaseRepository
	helmRepo                  repository.HelmRepoRepository
	registry                  repository.RegistryRepository
	gitRepo                   repository.GitRepoRepository
	gitActionConfig           repository.GitActionConfigRepository
	invite                    repository.InviteRepository
	release                   repository.ReleaseRepository
	environment               repository.EnvironmentRepository
	authCode                  repository.AuthCodeRepository
	dnsRecord                 repository.DNSRecordRepository
	pwResetToken              repository.PWResetTokenRepository
	infra                     repository.InfraRepository
	kubeIntegration           repository.KubeIntegrationRepository
	basicIntegration          repository.BasicIntegrationRepository
	oidcIntegration           repository.OIDCIntegrationRepository
	oauthIntegration          repository.OAuthIntegrationRepository
	gcpIntegration            repository.GCPIntegrationRepository
	awsIntegration            repository.AWSIntegrationRepository
	azIntegration             repository.AzureIntegrationRepository
	githubAppInstallation     repository.GithubAppInstallationRepository
	githubAppOAuthIntegration repository.GithubAppOAuthIntegrationRepository
	slackIntegration          repository.SlackIntegrationRepository
	gitlabIntegration         repository.GitlabIntegrationRepository
	gitlabAppOAuthIntegration repository.GitlabAppOAuthIntegrationRepository
	notificationConfig        repository.NotificationConfigRepository
	jobNotificationConfig     repository.JobNotificationConfigRepository
	buildEvent                repository.BuildEventRepository
	kubeEvent                 repository.KubeEventRepository
	projectUsage              repository.ProjectUsageRepository
	onboarding                repository.ProjectOnboardingRepository
	ceToken                   repository.CredentialsExchangeTokenRepository
	buildConfig               repository.BuildConfigRepository
	allowlist                 repository.AllowlistRepository
	apiToken                  repository.APITokenRepository
	policy                    repository.PolicyRepository
	tag                       repository.TagRepository
	stack                     repository.StackRepository
	monitor                   repository.MonitorTestResultRepository
	apiContractRevisions      repository.APIContractRevisioner
	awsAssumeRoleChainer      repository.AWSAssumeRoleChainer
	porterApp                 repository.PorterAppRepository
	porterAppEvent            repository.PorterAppEventRepository
	deploymentTarget          repository.DeploymentTargetRepository
	appRevision               repository.AppRevisionRepository
	appTemplate               repository.AppTemplateRepository
	githubWebhook             repository.GithubWebhookRepository
	datastore                 repository.DatastoreRepository
	appInstance               repository.AppInstanceRepository
	ipam                      repository.IpamRepository
}

func (t *GormRepository) User() repository.UserRepository {
	return t.user
}

func (t *GormRepository) Session() repository.SessionRepository {
	return t.session
}

func (t *GormRepository) Project() repository.ProjectRepository {
	return t.project
}

func (t *GormRepository) Cluster() repository.ClusterRepository {
	return t.cluster
}

func (t *GormRepository) Database() repository.DatabaseRepository {
	return t.database
}

func (t *GormRepository) HelmRepo() repository.HelmRepoRepository {
	return t.helmRepo
}

func (t *GormRepository) Registry() repository.RegistryRepository {
	return t.registry
}

func (t *GormRepository) GitRepo() repository.GitRepoRepository {
	return t.gitRepo
}

func (t *GormRepository) GitActionConfig() repository.GitActionConfigRepository {
	return t.gitActionConfig
}

func (t *GormRepository) Invite() repository.InviteRepository {
	return t.invite
}

func (t *GormRepository) Release() repository.ReleaseRepository {
	return t.release
}

func (t *GormRepository) Environment() repository.EnvironmentRepository {
	return t.environment
}

func (t *GormRepository) AuthCode() repository.AuthCodeRepository {
	return t.authCode
}

func (t *GormRepository) DNSRecord() repository.DNSRecordRepository {
	return t.dnsRecord
}

func (t *GormRepository) PWResetToken() repository.PWResetTokenRepository {
	return t.pwResetToken
}

func (t *GormRepository) Infra() repository.InfraRepository {
	return t.infra
}

func (t *GormRepository) KubeIntegration() repository.KubeIntegrationRepository {
	return t.kubeIntegration
}

func (t *GormRepository) BasicIntegration() repository.BasicIntegrationRepository {
	return t.basicIntegration
}

func (t *GormRepository) OIDCIntegration() repository.OIDCIntegrationRepository {
	return t.oidcIntegration
}

func (t *GormRepository) OAuthIntegration() repository.OAuthIntegrationRepository {
	return t.oauthIntegration
}

func (t *GormRepository) GCPIntegration() repository.GCPIntegrationRepository {
	return t.gcpIntegration
}

func (t *GormRepository) AWSIntegration() repository.AWSIntegrationRepository {
	return t.awsIntegration
}

func (t *GormRepository) AzureIntegration() repository.AzureIntegrationRepository {
	return t.azIntegration
}

func (t *GormRepository) GithubAppInstallation() repository.GithubAppInstallationRepository {
	return t.githubAppInstallation
}

func (t *GormRepository) GithubAppOAuthIntegration() repository.GithubAppOAuthIntegrationRepository {
	return t.githubAppOAuthIntegration
}

func (t *GormRepository) SlackIntegration() repository.SlackIntegrationRepository {
	return t.slackIntegration
}

func (t *GormRepository) GitlabIntegration() repository.GitlabIntegrationRepository {
	return t.gitlabIntegration
}

func (t *GormRepository) GitlabAppOAuthIntegration() repository.GitlabAppOAuthIntegrationRepository {
	return t.gitlabAppOAuthIntegration
}

func (t *GormRepository) NotificationConfig() repository.NotificationConfigRepository {
	return t.notificationConfig
}

func (t *GormRepository) JobNotificationConfig() repository.JobNotificationConfigRepository {
	return t.jobNotificationConfig
}

func (t *GormRepository) BuildEvent() repository.BuildEventRepository {
	return t.buildEvent
}

func (t *GormRepository) KubeEvent() repository.KubeEventRepository {
	return t.kubeEvent
}

func (t *GormRepository) ProjectUsage() repository.ProjectUsageRepository {
	return t.projectUsage
}

func (t *GormRepository) Onboarding() repository.ProjectOnboardingRepository {
	return t.onboarding
}

func (t *GormRepository) CredentialsExchangeToken() repository.CredentialsExchangeTokenRepository {
	return t.ceToken
}

func (t *GormRepository) BuildConfig() repository.BuildConfigRepository {
	return t.buildConfig
}

func (t *GormRepository) Allowlist() repository.AllowlistRepository {
	return t.allowlist
}

func (t *GormRepository) APIToken() repository.APITokenRepository {
	return t.apiToken
}

func (t *GormRepository) Policy() repository.PolicyRepository {
	return t.policy
}

func (t *GormRepository) Tag() repository.TagRepository {
	return t.tag
}

func (t *GormRepository) Stack() repository.StackRepository {
	return t.stack
}

func (t *GormRepository) PorterApp() repository.PorterAppRepository {
	return t.porterApp
}

func (t *GormRepository) MonitorTestResult() repository.MonitorTestResultRepository {
	return t.monitor
}

func (t *GormRepository) APIContractRevisioner() repository.APIContractRevisioner {
	return t.apiContractRevisions
}

func (t *GormRepository) AWSAssumeRoleChainer() repository.AWSAssumeRoleChainer {
	return t.awsAssumeRoleChainer
}

func (t *GormRepository) PorterAppEvent() repository.PorterAppEventRepository {
	return t.porterAppEvent
}

// DeploymentTarget returns the DeploymentTargetRepository interface implemented by gorm
func (t *GormRepository) DeploymentTarget() repository.DeploymentTargetRepository {
	return t.deploymentTarget
}

// AppRevision returns the AppRevisionRepository interface implemented by gorm
func (t *GormRepository) AppRevision() repository.AppRevisionRepository {
	return t.appRevision
}

// AppTemplate returns the AppTemplateRepository interface implemented by gorm
func (t *GormRepository) AppTemplate() repository.AppTemplateRepository {
	return t.appTemplate
}

// GithubWebhook returns the GithubWebhookRepository interface implemented by gorm
func (t *GormRepository) GithubWebhook() repository.GithubWebhookRepository {
	return t.githubWebhook
}

// Datastore returns the DatastoreRepository interface implemented by gorm
func (t *GormRepository) Datastore() repository.DatastoreRepository {
	return t.datastore
}

// AppInstance returns the AppInstanceRepository interface implemented by gorm
func (t *GormRepository) AppInstance() repository.AppInstanceRepository {
	return t.appInstance
}

// Ipam returns the IpamRepository interface implemented by gorm
func (t *GormRepository) Ipam() repository.IpamRepository {
	return t.ipam
}

// NewRepository returns a Repository which persists users in memory
// and accepts a parameter that can trigger read/write errors
func NewRepository(db *gorm.DB, key *[32]byte, storageBackend credentials.CredentialStorage) repository.Repository {
	return &GormRepository{
		user:                      NewUserRepository(db),
		session:                   NewSessionRepository(db),
		project:                   NewProjectRepository(db),
		cluster:                   NewClusterRepository(db, key),
		database:                  NewDatabaseRepository(db, key),
		helmRepo:                  NewHelmRepoRepository(db, key),
		registry:                  NewRegistryRepository(db, key),
		gitRepo:                   NewGitRepoRepository(db, key),
		gitActionConfig:           NewGitActionConfigRepository(db),
		invite:                    NewInviteRepository(db),
		release:                   NewReleaseRepository(db),
		environment:               NewEnvironmentRepository(db),
		authCode:                  NewAuthCodeRepository(db),
		dnsRecord:                 NewDNSRecordRepository(db),
		pwResetToken:              NewPWResetTokenRepository(db),
		infra:                     NewInfraRepository(db, key),
		kubeIntegration:           NewKubeIntegrationRepository(db, key),
		basicIntegration:          NewBasicIntegrationRepository(db, key),
		oidcIntegration:           NewOIDCIntegrationRepository(db, key),
		oauthIntegration:          NewOAuthIntegrationRepository(db, key, storageBackend),
		gcpIntegration:            NewGCPIntegrationRepository(db, key, storageBackend),
		awsIntegration:            NewAWSIntegrationRepository(db, key, storageBackend),
		azIntegration:             NewAzureIntegrationRepository(db, key, storageBackend),
		githubAppInstallation:     NewGithubAppInstallationRepository(db),
		githubAppOAuthIntegration: NewGithubAppOAuthIntegrationRepository(db),
		slackIntegration:          NewSlackIntegrationRepository(db, key),
		gitlabIntegration:         NewGitlabIntegrationRepository(db, key, storageBackend),
		gitlabAppOAuthIntegration: NewGitlabAppOAuthIntegrationRepository(db, key, storageBackend),
		notificationConfig:        NewNotificationConfigRepository(db),
		jobNotificationConfig:     NewJobNotificationConfigRepository(db),
		buildEvent:                NewBuildEventRepository(db),
		kubeEvent:                 NewKubeEventRepository(db, key),
		projectUsage:              NewProjectUsageRepository(db),
		onboarding:                NewProjectOnboardingRepository(db),
		ceToken:                   NewCredentialsExchangeTokenRepository(db),
		buildConfig:               NewBuildConfigRepository(db),
		allowlist:                 NewAllowlistRepository(db),
		apiToken:                  NewAPITokenRepository(db),
		policy:                    NewPolicyRepository(db),
		tag:                       NewTagRepository(db),
		stack:                     NewStackRepository(db),
		monitor:                   NewMonitorTestResultRepository(db),
		apiContractRevisions:      NewAPIContractRevisioner(db),
		awsAssumeRoleChainer:      NewAWSAssumeRoleChainer(db),
		porterApp:                 NewPorterAppRepository(db),
		porterAppEvent:            NewPorterAppEventRepository(db),
		deploymentTarget:          NewDeploymentTargetRepository(db),
		appRevision:               NewAppRevisionRepository(db),
		appTemplate:               NewAppTemplateRepository(db),
		githubWebhook:             NewGithubWebhookRepository(db),
		datastore:                 NewDatastoreRepository(db),
		appInstance:               NewAppInstanceRepository(db),
		ipam:                      NewIpamRepository(db),
	}
}
