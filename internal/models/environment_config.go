package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// Environment Config type used to set up an instance of an environment

type EnvironmentConfig struct {
	gorm.Model

	ProjectID         uint
	ClusterID         uint
	GitInstallationID uint

	WebhookID       string `gorm:"unique"`
	GithubWebhookID int64

	Name string
	Auto bool

	PreviewEnvironments []PreviewEnvironment
}

func (c *EnvironmentConfig) ToEnvironmentConfigType() *types.EnvironmentConfig {
	return &types.EnvironmentConfig{
		ID:                c.Model.ID,
		ProjectID:         c.ProjectID,
		ClusterID:         c.ClusterID,
		GitInstallationID: c.GitInstallationID,
		Name:              c.Name,
		Auto:              c.Auto,
	}
}
