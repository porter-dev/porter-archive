package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"

	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB, debug bool) error {
	instanceDB := db

	if debug {
		instanceDB = instanceDB.Debug()
	}

	return instanceDB.AutoMigrate(
		&models.Project{},
		&models.Role{},
		&models.User{},
		&models.Release{},
		&models.Environment{},
		&models.Deployment{},
		&models.Session{},
		&models.GitRepo{},
		&models.Registry{},
		&models.HelmRepo{},
		&models.Cluster{},
		&models.ClusterCandidate{},
		&models.ClusterResolver{},
		&models.Database{},
		&models.Infra{},
		&models.Operation{},
		&models.GitActionConfig{},
		&models.Invite{},
		&models.AuthCode{},
		&models.DNSRecord{},
		&models.PWResetToken{},
		&models.NotificationConfig{},
		&models.JobNotificationConfig{},
		&models.EventContainer{},
		&models.SubEvent{},
		&models.KubeEvent{},
		&models.KubeSubEvent{},
		&models.ProjectUsage{},
		&models.ProjectUsageCache{},
		&models.Onboarding{},
		&models.CredentialsExchangeToken{},
		&models.BuildConfig{},
		&models.Allowlist{},
		&models.APIToken{},
		&models.Policy{},
		&models.Tag{},
		&ints.KubeIntegration{},
		&ints.BasicIntegration{},
		&ints.OIDCIntegration{},
		&ints.OAuthIntegration{},
		&ints.GCPIntegration{},
		&ints.AWSIntegration{},
		&ints.AzureIntegration{},
		&ints.GitlabIntegration{},
		&ints.GitlabAppOAuthIntegration{},
		&ints.TokenCache{},
		&ints.ClusterTokenCache{},
		&ints.RegTokenCache{},
		&ints.HelmRepoTokenCache{},
		&ints.GithubAppInstallation{},
		&ints.GithubAppOAuthIntegration{},
		&ints.SlackIntegration{},
	)
}
