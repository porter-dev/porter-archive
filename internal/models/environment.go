package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type EnvironmentMode uint

type Environment struct {
	gorm.Model

	ProjectID         uint
	ClusterID         uint
	GitInstallationID uint
	GitRepoOwner      string
	GitRepoName       string

	Name string
	Mode string

	NewCommentsDisabled bool

	// WebhookID uniquely identifies the environment when other fields (project, cluster)
	// aren't present
	WebhookID string `gorm:"unique"`

	GithubWebhookID int64
}

func (e *Environment) ToEnvironmentType() *types.Environment {
	return &types.Environment{
		ID:                e.Model.ID,
		ProjectID:         e.ProjectID,
		ClusterID:         e.ClusterID,
		GitInstallationID: e.GitInstallationID,
		GitRepoOwner:      e.GitRepoOwner,
		GitRepoName:       e.GitRepoName,

		NewCommentsDisabled: e.NewCommentsDisabled,

		Name: e.Name,
		Mode: e.Mode,
	}
}

type Deployment struct {
	gorm.Model

	EnvironmentID  uint
	Namespace      string
	Status         types.DeploymentStatus
	Subdomain      string
	PullRequestID  uint
	GHDeploymentID int64
	GHPRCommentID  int64
	PRName         string
	RepoName       string
	RepoOwner      string
	CommitSHA      string
	PRBranchFrom   string
	PRBranchInto   string
}

func (d *Deployment) ToDeploymentType() *types.Deployment {

	ghMetadata := &types.GitHubMetadata{
		DeploymentID: d.GHDeploymentID,
		PRName:       d.PRName,
		RepoName:     d.RepoName,
		RepoOwner:    d.RepoOwner,
		CommitSHA:    d.CommitSHA,
		PRBranchFrom: d.PRBranchFrom,
		PRBranchInto: d.PRBranchInto,
	}

	return &types.Deployment{
		CreatedAt:      d.CreatedAt,
		UpdatedAt:      d.UpdatedAt,
		ID:             d.Model.ID,
		EnvironmentID:  d.EnvironmentID,
		Namespace:      d.Namespace,
		Status:         d.Status,
		Subdomain:      d.Subdomain,
		PullRequestID:  d.PullRequestID,
		GitHubMetadata: ghMetadata,
	}
}
