package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// Environment Config type used to set up an instance of an environment

type EnvironmentConfig struct {
	gorm.Model

	ProjectID         uint
	ClusterID         uint `gorm:"uniqueIndex:idx_cluster_id_name"`
	GitInstallationID uint

	WebhookID       string `gorm:"unique"`
	GithubWebhookID int64

	Name      string `gorm:"uniqueIndex:idx_cluster_id_name"`
	Auto      bool   `gorm:"default:false"`
	IsDefault bool   `gorm:"default:false"`

	PorterApps          []PorterApp
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
