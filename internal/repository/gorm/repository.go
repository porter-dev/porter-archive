package gorm

import (
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// NewRepository returns a Repository which uses
// gorm.DB for querying the database
func NewRepository(db *gorm.DB, key *[32]byte) *repository.Repository {
	return &repository.Repository{
		User:             NewUserRepository(db),
		Session:          NewSessionRepository(db),
		Project:          NewProjectRepository(db),
		Release:          NewReleaseRepository(db),
		GitRepo:          NewGitRepoRepository(db, key),
		Cluster:          NewClusterRepository(db, key),
		HelmRepo:         NewHelmRepoRepository(db, key),
		Registry:         NewRegistryRepository(db, key),
		Infra:            NewInfraRepository(db, key),
		GitActionConfig:  NewGitActionConfigRepository(db),
		Invite:           NewInviteRepository(db),
		AuthCode:         NewAuthCodeRepository(db),
		DNSRecord:        NewDNSRecordRepository(db),
		PWResetToken:     NewPWResetTokenRepository(db),
		KubeIntegration:  NewKubeIntegrationRepository(db, key),
		BasicIntegration: NewBasicIntegrationRepository(db, key),
		OIDCIntegration:  NewOIDCIntegrationRepository(db, key),
		OAuthIntegration: NewOAuthIntegrationRepository(db, key),
		GCPIntegration:   NewGCPIntegrationRepository(db, key),
		AWSIntegration:   NewAWSIntegrationRepository(db, key),
	}
}
