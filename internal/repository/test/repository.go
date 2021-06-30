package test

import (
	"github.com/porter-dev/porter/internal/repository"
)

type TestRepository struct {
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

// NewRepository returns a Repository which persists users in memory
// and accepts a parameter that can trigger read/write errors
func NewRepository(canQuery bool, failingMethods ...string) repository.Repository {
	return &TestRepository{
		user:             NewUserRepository(canQuery, failingMethods...),
		session:          NewSessionRepository(canQuery, failingMethods...),
		project:          NewProjectRepository(canQuery, failingMethods...),
		cluster:          NewClusterRepository(canQuery),
		helmRepo:         NewHelmRepoRepository(canQuery),
		registry:         NewRegistryRepository(canQuery),
		gitRepo:          NewGitRepoRepository(canQuery),
		gitActionConfig:  NewGitActionConfigRepository(canQuery),
		invite:           NewInviteRepository(canQuery),
		release:          NewReleaseRepository(canQuery),
		authCode:         NewAuthCodeRepository(canQuery),
		dnsRecord:        NewDNSRecordRepository(canQuery),
		pwResetToken:     NewPWResetTokenRepository(canQuery),
		infra:            NewInfraRepository(canQuery),
		kubeIntegration:  NewKubeIntegrationRepository(canQuery),
		basicIntegration: NewBasicIntegrationRepository(canQuery),
		oidcIntegration:  NewOIDCIntegrationRepository(canQuery),
		oauthIntegration: NewOAuthIntegrationRepository(canQuery),
		gcpIntegration:   NewGCPIntegrationRepository(canQuery),
		awsIntegration:   NewAWSIntegrationRepository(canQuery),
	}
}
