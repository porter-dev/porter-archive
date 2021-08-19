package gorm

import (
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

<<<<<<< HEAD
type GormRepository struct {
	user             repository.UserRepository
	session          repository.SessionRepository
	project          repository.ProjectRepository
	cluster          repository.ClusterRepository
	helmRepo         repository.HelmRepoRepository
	registry         repository.RegistryRepository
	gitRepo          repository.GitRepoRepository
	gitActionConfig  repository.GitActionConfigRepository
	invite           repository.InviteRepository
	release          repository.ReleaseRepository
	authCode         repository.AuthCodeRepository
	dnsRecord        repository.DNSRecordRepository
	pwResetToken     repository.PWResetTokenRepository
	infra            repository.InfraRepository
	kubeIntegration  repository.KubeIntegrationRepository
	basicIntegration repository.BasicIntegrationRepository
	oidcIntegration  repository.OIDCIntegrationRepository
	oauthIntegration repository.OAuthIntegrationRepository
	gcpIntegration   repository.GCPIntegrationRepository
	awsIntegration   repository.AWSIntegrationRepository
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

// NewRepository returns a Repository which persists users in memory
// and accepts a parameter that can trigger read/write errors
func NewRepository(db *gorm.DB, key *[32]byte) repository.Repository {
	return &GormRepository{
		user:             NewUserRepository(db),
		session:          NewSessionRepository(db),
		project:          NewProjectRepository(db),
		cluster:          NewClusterRepository(db, key),
		helmRepo:         NewHelmRepoRepository(db, key),
		registry:         NewRegistryRepository(db, key),
		gitRepo:          NewGitRepoRepository(db, key),
		gitActionConfig:  NewGitActionConfigRepository(db),
		invite:           NewInviteRepository(db),
		release:          NewReleaseRepository(db),
		authCode:         NewAuthCodeRepository(db),
		dnsRecord:        NewDNSRecordRepository(db),
		pwResetToken:     NewPWResetTokenRepository(db),
		infra:            NewInfraRepository(db, key),
		kubeIntegration:  NewKubeIntegrationRepository(db, key),
		basicIntegration: NewBasicIntegrationRepository(db, key),
		oidcIntegration:  NewOIDCIntegrationRepository(db, key),
		oauthIntegration: NewOAuthIntegrationRepository(db, key),
		gcpIntegration:   NewGCPIntegrationRepository(db, key),
		awsIntegration:   NewAWSIntegrationRepository(db, key),
=======
// NewRepository returns a Repository which uses
// gorm.DB for querying the database
func NewRepository(db *gorm.DB, key *[32]byte) *repository.Repository {
	return &repository.Repository{
		User:                      NewUserRepository(db),
		Session:                   NewSessionRepository(db),
		Project:                   NewProjectRepository(db),
		Release:                   NewReleaseRepository(db),
		GitRepo:                   NewGitRepoRepository(db, key),
		Cluster:                   NewClusterRepository(db, key),
		HelmRepo:                  NewHelmRepoRepository(db, key),
		Registry:                  NewRegistryRepository(db, key),
		Infra:                     NewInfraRepository(db, key),
		GitActionConfig:           NewGitActionConfigRepository(db),
		Invite:                    NewInviteRepository(db),
		AuthCode:                  NewAuthCodeRepository(db),
		DNSRecord:                 NewDNSRecordRepository(db),
		PWResetToken:              NewPWResetTokenRepository(db),
		KubeIntegration:           NewKubeIntegrationRepository(db, key),
		BasicIntegration:          NewBasicIntegrationRepository(db, key),
		OIDCIntegration:           NewOIDCIntegrationRepository(db, key),
		OAuthIntegration:          NewOAuthIntegrationRepository(db, key),
		GCPIntegration:            NewGCPIntegrationRepository(db, key),
		AWSIntegration:            NewAWSIntegrationRepository(db, key),
		GithubAppInstallation:     NewGithubAppInstallationRepository(db),
		GithubAppOAuthIntegration: NewGithubAppOAuthIntegrationRepository(db),
		SlackIntegration:          NewSlackIntegrationRepository(db, key),
		NotificationConfig:        NewNotificationConfigRepository(db),
>>>>>>> master
	}
}
