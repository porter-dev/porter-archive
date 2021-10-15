package gorm

import (
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type GormRepository struct {
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
	githubAppInstallation     repository.GithubAppInstallationRepository
	githubAppOAuthIntegration repository.GithubAppOAuthIntegrationRepository
	slackIntegration          repository.SlackIntegrationRepository
	notificationConfig        repository.NotificationConfigRepository
	event                     repository.EventRepository
	projectUsage              repository.ProjectUsageRepository
	onboarding                repository.ProjectOnboardingRepository
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

func (t *GormRepository) GithubAppInstallation() repository.GithubAppInstallationRepository {
	return t.githubAppInstallation
}

func (t *GormRepository) GithubAppOAuthIntegration() repository.GithubAppOAuthIntegrationRepository {
	return t.githubAppOAuthIntegration
}

func (t *GormRepository) SlackIntegration() repository.SlackIntegrationRepository {
	return t.slackIntegration
}

func (t *GormRepository) NotificationConfig() repository.NotificationConfigRepository {
	return t.notificationConfig
}

func (t *GormRepository) Event() repository.EventRepository {
	return t.event
}

func (t *GormRepository) ProjectUsage() repository.ProjectUsageRepository {
	return t.projectUsage
}

func (t *GormRepository) Onboarding() repository.ProjectOnboardingRepository {
	return t.onboarding
}

// NewRepository returns a Repository which persists users in memory
// and accepts a parameter that can trigger read/write errors
func NewRepository(db *gorm.DB, key *[32]byte) repository.Repository {
	return &GormRepository{
		user:                      NewUserRepository(db),
		session:                   NewSessionRepository(db),
		project:                   NewProjectRepository(db),
		cluster:                   NewClusterRepository(db, key),
		helmRepo:                  NewHelmRepoRepository(db, key),
		registry:                  NewRegistryRepository(db, key),
		gitRepo:                   NewGitRepoRepository(db, key),
		gitActionConfig:           NewGitActionConfigRepository(db),
		invite:                    NewInviteRepository(db),
		release:                   NewReleaseRepository(db),
		authCode:                  NewAuthCodeRepository(db),
		dnsRecord:                 NewDNSRecordRepository(db),
		pwResetToken:              NewPWResetTokenRepository(db),
		infra:                     NewInfraRepository(db, key),
		kubeIntegration:           NewKubeIntegrationRepository(db, key),
		basicIntegration:          NewBasicIntegrationRepository(db, key),
		oidcIntegration:           NewOIDCIntegrationRepository(db, key),
		oauthIntegration:          NewOAuthIntegrationRepository(db, key),
		gcpIntegration:            NewGCPIntegrationRepository(db, key),
		awsIntegration:            NewAWSIntegrationRepository(db, key),
		githubAppInstallation:     NewGithubAppInstallationRepository(db),
		githubAppOAuthIntegration: NewGithubAppOAuthIntegrationRepository(db),
		slackIntegration:          NewSlackIntegrationRepository(db, key),
		notificationConfig:        NewNotificationConfigRepository(db),
		event:                     NewEventRepository(db),
		projectUsage:              NewProjectUsageRepository(db),
		onboarding:                NewProjectOnboardingRepository(db),
	}
}
