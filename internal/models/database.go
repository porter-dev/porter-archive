package models

import (
	"gorm.io/gorm"
)

type Database struct {
	gorm.Model

	ProjectID uint `json:"project_id"`
	Project   Project

	InfraID uint `json:"infra_id"`
	Infra   Infra

	InstanceID       string `json:"instance_id"`
	InstanceEndpoint string `json:"instance_endpoint"`
	InstanceName     string `json:"instance_name"`
}
