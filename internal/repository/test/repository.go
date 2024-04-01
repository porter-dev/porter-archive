package test

import (
	"github.com/porter-dev/porter/internal/repository"
)

type TestRepository struct {
	user                      repository.UserRepository
	session                   repository.SessionRepository
	project                   repository.ProjectRepository
	cluster                   repository.ClusterRepository
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
	gitlabIntegration         repository.GitlabIntegrationRepository
	gitlabAppOAuthIntegration repository.GitlabAppOAuthIntegrationRepository
	slackIntegration          repository.SlackIntegrationRepository
	notificationConfig        repository.NotificationConfigRepository
	jobNotificationConfig     repository.JobNotificationConfigRepository
	buildEvent                repository.BuildEventRepository
	kubeEvent                 repository.KubeEventRepository
	projectUsage              repository.ProjectUsageRepository
	onboarding                repository.ProjectOnboardingRepository
	ceToken                   repository.CredentialsExchangeTokenRepository
	buildConfig               repository.BuildConfigRepository
	database                  repository.DatabaseRepository
	allowlist                 repository.AllowlistRepository
	apiToken                  repository.APITokenRepository
	policy                    repository.PolicyRepository
	tag                       repository.TagRepository
	stack                     repository.StackRepository
	monitor                   repository.MonitorTestResultRepository
	apiContractRevision       repository.APIContractRevisioner
	awsAssumeRoleChainer      repository.AWSAssumeRoleChainer
	porterApp                 repository.PorterAppRepository
	porterAppEvent            repository.PorterAppEventRepository
	deploymentTarget          repository.DeploymentTargetRepository
	appRevision               repository.AppRevisionRepository
	appTemplate               repository.AppTemplateRepository
	githubWebhook             repository.GithubWebhookRepository
	datastore                 repository.DatastoreRepository
	appInstance               repository.AppInstanceRepository
}

func (t *TestRepository) User() repository.UserRepository {
	return t.user
}

func (t *TestRepository) Session() repository.SessionRepository {
	return t.session
}

func (t *TestRepository) Project() repository.ProjectRepository {
	return t.project
}

func (t *TestRepository) Cluster() repository.ClusterRepository {
	return t.cluster
}

func (t *TestRepository) HelmRepo() repository.HelmRepoRepository {
	return t.helmRepo
}

func (t *TestRepository) Registry() repository.RegistryRepository {
	return t.registry
}

func (t *TestRepository) GitRepo() repository.GitRepoRepository {
	return t.gitRepo
}

func (t *TestRepository) GitActionConfig() repository.GitActionConfigRepository {
	return t.gitActionConfig
}

func (t *TestRepository) Invite() repository.InviteRepository {
	return t.invite
}

func (t *TestRepository) Release() repository.ReleaseRepository {
	return t.release
}

func (t *TestRepository) Environment() repository.EnvironmentRepository {
	return t.environment
}

func (t *TestRepository) AuthCode() repository.AuthCodeRepository {
	return t.authCode
}

func (t *TestRepository) DNSRecord() repository.DNSRecordRepository {
	return t.dnsRecord
}

func (t *TestRepository) PWResetToken() repository.PWResetTokenRepository {
	return t.pwResetToken
}

func (t *TestRepository) Infra() repository.InfraRepository {
	return t.infra
}

func (t *TestRepository) KubeIntegration() repository.KubeIntegrationRepository {
	return t.kubeIntegration
}

func (t *TestRepository) BasicIntegration() repository.BasicIntegrationRepository {
	return t.basicIntegration
}

func (t *TestRepository) OIDCIntegration() repository.OIDCIntegrationRepository {
	return t.oidcIntegration
}

func (t *TestRepository) OAuthIntegration() repository.OAuthIntegrationRepository {
	return t.oauthIntegration
}

func (t *TestRepository) GCPIntegration() repository.GCPIntegrationRepository {
	return t.gcpIntegration
}

func (t *TestRepository) AWSIntegration() repository.AWSIntegrationRepository {
	return t.awsIntegration
}

func (t *TestRepository) AzureIntegration() repository.AzureIntegrationRepository {
	return t.azIntegration
}

func (t *TestRepository) GithubAppInstallation() repository.GithubAppInstallationRepository {
	return t.githubAppInstallation
}

func (t *TestRepository) GithubAppOAuthIntegration() repository.GithubAppOAuthIntegrationRepository {
	return t.githubAppOAuthIntegration
}

func (t *TestRepository) GitlabIntegration() repository.GitlabIntegrationRepository {
	return t.gitlabIntegration
}

func (t *TestRepository) GitlabAppOAuthIntegration() repository.GitlabAppOAuthIntegrationRepository {
	return t.gitlabAppOAuthIntegration
}

func (t *TestRepository) SlackIntegration() repository.SlackIntegrationRepository {
	return t.slackIntegration
}

func (t *TestRepository) NotificationConfig() repository.NotificationConfigRepository {
	return t.notificationConfig
}

func (t *TestRepository) JobNotificationConfig() repository.JobNotificationConfigRepository {
	return t.jobNotificationConfig
}

func (t *TestRepository) BuildEvent() repository.BuildEventRepository {
	return t.buildEvent
}

func (t *TestRepository) KubeEvent() repository.KubeEventRepository {
	return t.kubeEvent
}

func (t *TestRepository) ProjectUsage() repository.ProjectUsageRepository {
	return t.projectUsage
}

func (t *TestRepository) Onboarding() repository.ProjectOnboardingRepository {
	return t.onboarding
}

func (t *TestRepository) CredentialsExchangeToken() repository.CredentialsExchangeTokenRepository {
	return t.ceToken
}

func (t *TestRepository) BuildConfig() repository.BuildConfigRepository {
	return t.buildConfig
}

func (t *TestRepository) Database() repository.DatabaseRepository {
	return t.database
}

func (t *TestRepository) Allowlist() repository.AllowlistRepository {
	return t.allowlist
}

func (t *TestRepository) APIToken() repository.APITokenRepository {
	return t.apiToken
}

func (t *TestRepository) Policy() repository.PolicyRepository {
	return t.policy
}

func (t *TestRepository) Tag() repository.TagRepository {
	return t.tag
}

func (t *TestRepository) Stack() repository.StackRepository {
	return t.stack
}

func (t *TestRepository) MonitorTestResult() repository.MonitorTestResultRepository {
	return t.monitor
}

func (t *TestRepository) APIContractRevisioner() repository.APIContractRevisioner {
	return t.apiContractRevision
}

func (t *TestRepository) AWSAssumeRoleChainer() repository.AWSAssumeRoleChainer {
	return t.awsAssumeRoleChainer
}

func (t *TestRepository) PorterApp() repository.PorterAppRepository {
	return t.porterApp
}

func (t *TestRepository) PorterAppEvent() repository.PorterAppEventRepository {
	return t.porterAppEvent
}

// DeploymentTarget returns a test DeploymentTargetRepository
func (t *TestRepository) DeploymentTarget() repository.DeploymentTargetRepository {
	return t.deploymentTarget
}

// AppRevision returns a test AppRevisionRepository
func (t *TestRepository) AppRevision() repository.AppRevisionRepository {
	return t.appRevision
}

// AppTemplate returns a test AppTemplateRepository
func (t *TestRepository) AppTemplate() repository.AppTemplateRepository {
	return t.appTemplate
}

// GithubWebhook returns a test GithubWebhookRepository
func (t *TestRepository) GithubWebhook() repository.GithubWebhookRepository {
	return t.githubWebhook
}

// Datastore returns a test DatastoreRepository
func (t *TestRepository) Datastore() repository.DatastoreRepository {
	return t.datastore
}

// AppInstance returns a test AppInstanceRepository
func (t *TestRepository) AppInstance() repository.AppInstanceRepository {
	return t.appInstance
}

// NewRepository returns a Repository which persists users in memory
// and accepts a parameter that can trigger read/write errors
func NewRepository(canQuery bool, failingMethods ...string) repository.Repository {
	return &TestRepository{
		user:                      NewUserRepository(canQuery, failingMethods...),
		session:                   NewSessionRepository(canQuery, failingMethods...),
		project:                   NewProjectRepository(canQuery, failingMethods...),
		cluster:                   NewClusterRepository(canQuery),
		helmRepo:                  NewHelmRepoRepository(canQuery),
		registry:                  NewRegistryRepository(canQuery),
		gitRepo:                   NewGitRepoRepository(canQuery),
		gitActionConfig:           NewGitActionConfigRepository(canQuery),
		invite:                    NewInviteRepository(canQuery),
		release:                   NewReleaseRepository(canQuery),
		environment:               NewEnvironmentRepository(),
		authCode:                  NewAuthCodeRepository(canQuery),
		dnsRecord:                 NewDNSRecordRepository(canQuery),
		pwResetToken:              NewPWResetTokenRepository(canQuery),
		infra:                     NewInfraRepository(canQuery),
		kubeIntegration:           NewKubeIntegrationRepository(canQuery),
		basicIntegration:          NewBasicIntegrationRepository(canQuery),
		oidcIntegration:           NewOIDCIntegrationRepository(canQuery),
		oauthIntegration:          NewOAuthIntegrationRepository(canQuery),
		gcpIntegration:            NewGCPIntegrationRepository(canQuery),
		awsIntegration:            NewAWSIntegrationRepository(canQuery),
		azIntegration:             NewAzureIntegrationRepository(),
		githubAppInstallation:     NewGithubAppInstallationRepository(canQuery),
		githubAppOAuthIntegration: NewGithubAppOAuthIntegrationRepository(canQuery),
		gitlabIntegration:         NewGitlabIntegrationRepository(canQuery),
		gitlabAppOAuthIntegration: NewGitlabAppOAuthIntegrationRepository(canQuery),
		slackIntegration:          NewSlackIntegrationRepository(canQuery),
		notificationConfig:        NewNotificationConfigRepository(canQuery),
		jobNotificationConfig:     NewJobNotificationConfigRepository(canQuery),
		buildEvent:                NewBuildEventRepository(canQuery),
		kubeEvent:                 NewKubeEventRepository(canQuery),
		projectUsage:              NewProjectUsageRepository(canQuery),
		onboarding:                NewProjectOnboardingRepository(canQuery),
		ceToken:                   NewCredentialsExchangeTokenRepository(canQuery),
		buildConfig:               NewBuildConfigRepository(canQuery),
		database:                  NewDatabaseRepository(),
		allowlist:                 NewAllowlistRepository(canQuery),
		apiToken:                  NewAPITokenRepository(canQuery),
		policy:                    NewPolicyRepository(canQuery),
		tag:                       NewTagRepository(),
		stack:                     NewStackRepository(),
		monitor:                   NewMonitorTestResultRepository(canQuery),
		apiContractRevision:       NewAPIContractRevisioner(),
		awsAssumeRoleChainer:      NewAWSAssumeRoleChainer(),
		porterApp:                 NewPorterAppRepository(canQuery, failingMethods...),
		porterAppEvent:            NewPorterAppEventRepository(canQuery),
		deploymentTarget:          NewDeploymentTargetRepository(),
		appRevision:               NewAppRevisionRepository(),
		appTemplate:               NewAppTemplateRepository(),
		githubWebhook:             NewGithubWebhookRepository(),
		datastore:                 NewDatastoreRepository(),
		appInstance:               NewAppInstanceRepository(),
	}
}
