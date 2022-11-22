package models

import (
	"strings"

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
	GitRepoBranches   string

	Name string
	Mode string

	NewCommentsDisabled  bool
	NamespaceLabels      []byte
	NamespaceAnnotations []byte

	// WebhookID uniquely identifies the environment when other fields (project, cluster)
	// aren't present
	WebhookID string `gorm:"unique"`

	GithubWebhookID int64
}

func getGitRepoBranches(branches string) []string {
	var branchesArr []string

	if branches != "" {
		supposedBranches := strings.Split(branches, ",")

		for _, br := range supposedBranches {
			name := strings.TrimSpace(br)

			if len(name) > 0 {
				branchesArr = append(branchesArr, name)
			}
		}
	}

	return branchesArr
}

func (e *Environment) ToEnvironmentType() *types.Environment {
	env := &types.Environment{
		ID:                e.Model.ID,
		ProjectID:         e.ProjectID,
		ClusterID:         e.ClusterID,
		GitInstallationID: e.GitInstallationID,
		GitRepoOwner:      e.GitRepoOwner,
		GitRepoName:       e.GitRepoName,

		NewCommentsDisabled: e.NewCommentsDisabled,
		NamespaceLabels:     make(map[string]string),

		Name: e.Name,
		Mode: e.Mode,
	}

	branches := getGitRepoBranches(e.GitRepoBranches)

	if len(branches) > 0 {
		env.GitRepoBranches = branches
	} else {
		env.GitRepoBranches = []string{}
	}

	if len(e.NamespaceLabels) > 0 {
		env.NamespaceLabels = make(map[string]string)
		labels := string(e.NamespaceLabels)

		for _, a := range strings.Split(labels, ",") {
			k, v, found := strings.Cut(a, "=")

			if found {
				env.NamespaceLabels[k] = v
			}
		}
	}

	return env
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
