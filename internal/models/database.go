package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type Database struct {
	gorm.Model

	ProjectID uint `json:"project_id"`
	Project   Project

	ClusterID uint `json:"cluster_id"`

	InfraID uint `json:"infra_id"`
	Infra   Infra

	InstanceID       string `json:"rds_instance_id"`
	InstanceEndpoint string `json:"rds_connection_endpoint"`
	InstanceName     string `json:"rds_instance_name"`
	Status           string
}

func (d *Database) ToDatabaseType() *types.Database {
	return &types.Database{
		ID:               d.ID,
		ProjectID:        d.ProjectID,
		ClusterID:        d.ClusterID,
		InfraID:          d.InfraID,
		InstanceID:       d.InstanceID,
		InstanceEndpoint: d.InstanceEndpoint,
		InstanceName:     d.InstanceName,
		Status:           d.Status,
	}
}
