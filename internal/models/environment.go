package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type Environment struct {
	gorm.Model

	ProjectID         uint
	ClusterID         uint
	GitInstallationID uint
	GitRepoOwner      string
	GitRepoName       string

	Name string
}

func (e *Environment) ToEnvironmentType() *types.Environment {
	return &types.Environment{
		ID:                e.Model.ID,
		ProjectID:         e.ProjectID,
		ClusterID:         e.ClusterID,
		GitInstallationID: e.GitInstallationID,
		GitRepoOwner:      e.GitRepoOwner,
		GitRepoName:       e.GitRepoName,
		Name:              e.Name,
	}
}

type Deployment struct {
	gorm.Model

	EnvironmentID      uint
	Namespace          string
	Status             string
	Subdomain          string
	PullRequestID      uint
	GHDeploymentID	   int64
	PRName			   string
	RepoName     	   string
	RepoOwner		   string
	CommitSHA		   string
}

func (d *Deployment) ToDeploymentType() *types.Deployment {

	ghMetadata := &types.GitHubMetadata{
		DeploymentID: d.GHDeploymentID,
		PRName:		  d.PRName,
		RepoName:	 d.RepoName,
		RepoOwner:	 d.RepoOwner,
		CommitSHA:	 d.CommitSHA,
	}

	return &types.Deployment{
		ID:                 d.Model.ID,
		EnvironmentID:      d.EnvironmentID,
		Namespace:          d.Namespace,
		Status:             d.Status,
		Subdomain:          d.Subdomain,
		PullRequestID:      d.PullRequestID,
		GitHubMetadata: 	ghMetadata,
	}
}
