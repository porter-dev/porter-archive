package models

import (
	"gorm.io/gorm"
)

// HostedCode represents a code that can be used to create a hosted project
type HostedCode struct {
	gorm.Model

	Code string `gorm:"primaryKey" json:"code"`

	HostClusterID uint `json:"host_cluster_id"`

	HostProjectID uint `json:"host_project_id"`
}
