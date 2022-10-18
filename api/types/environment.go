package types

import "time"

type Environment struct {
	ID                uint   `json:"id"`
	ProjectID         uint   `json:"project_id"`
	ClusterID         uint   `json:"cluster_id"`
	GitInstallationID uint   `json:"git_installation_id"`
	GitRepoOwner      string `json:"git_repo_owner"`
	GitRepoName       string `json:"git_repo_name"`

	Name                 string `json:"name"`
	Mode                 string `json:"mode"`
	DeploymentCount      uint   `json:"deployment_count"`
	LastDeploymentStatus string `json:"last_deployment_status"`
	NewCommentsDisabled  bool   `json:"new_comments_disabled"`
}

type CreateEnvironmentRequest struct {
	Name string `json:"name" form:"required"`
	Mode string `json:"mode" form:"oneof=auto manual" default:"manual"`
}

type GitHubMetadata struct {
	DeploymentID int64  `json:"gh_deployment_id"`
	PRName       string `json:"gh_pr_name"`
	RepoName     string `json:"gh_repo_name"`
	RepoOwner    string `json:"gh_repo_owner"`
	CommitSHA    string `json:"gh_commit_sha"`
	PRBranchFrom string `json:"gh_pr_branch_from"`
	PRBranchInto string `json:"gh_pr_branch_into"`
}

type DeploymentStatus string

const (
	DeploymentStatusCreated  DeploymentStatus = "created"
	DeploymentStatusCreating DeploymentStatus = "creating"
	DeploymentStatusUpdating DeploymentStatus = "updating"
	DeploymentStatusInactive DeploymentStatus = "inactive"
	DeploymentStatusTimedOut DeploymentStatus = "timed_out"
	DeploymentStatusFailed   DeploymentStatus = "failed"
)

type Deployment struct {
	*GitHubMetadata

	ID                 uint             `json:"id"`
	CreatedAt          time.Time        `json:"created_at"`
	UpdatedAt          time.Time        `json:"updated_at"`
	EnvironmentID      uint             `json:"environment_id"`
	Namespace          string           `json:"namespace"`
	Status             DeploymentStatus `json:"status"`
	Subdomain          string           `json:"subdomain"`
	PullRequestID      uint             `json:"pull_request_id"`
	InstallationID     uint             `json:"gh_installation_id"`
	LastWorkflowRunURL string           `json:"last_workflow_run_url"`
}

type CreateGHDeploymentRequest struct {
	ActionID uint `json:"action_id" form:"required"`
}

type CreateDeploymentRequest struct {
	*CreateGHDeploymentRequest
	*GitHubMetadata

	Namespace     string `json:"namespace" form:"required"`
	PullRequestID uint   `json:"pull_request_id" form:"required"`
}

type SuccessfullyDeployedResource struct {
	ReleaseName string `json:"release_name" form:"required"`
	ReleaseType string `json:"release_type"`
}

type FinalizeDeploymentRequest struct {
	Namespace           string                          `json:"namespace" form:"required"`
	SuccessfulResources []*SuccessfullyDeployedResource `json:"successful_resources"`
	Subdomain           string                          `json:"subdomain"`
}

type FinalizeDeploymentWithErrorsRequest struct {
	Namespace           string                          `json:"namespace" form:"required"`
	SuccessfulResources []*SuccessfullyDeployedResource `json:"successful_resources"`
	Errors              map[string]string               `json:"errors" form:"required"`
}

type UpdateDeploymentRequest struct {
	*CreateGHDeploymentRequest

	PRBranchFrom string `json:"gh_pr_branch_from" form:"required"`
	CommitSHA    string `json:"commit_sha" form:"required"`
	Namespace    string `json:"namespace" form:"required"`
}

type ListDeploymentRequest struct {
	EnvironmentID uint `schema:"environment_id"`
}

type UpdateDeploymentStatusRequest struct {
	*CreateGHDeploymentRequest

	PRBranchFrom string `json:"gh_pr_branch_from" form:"required"`
	Status       string `json:"status" form:"required,oneof=created creating inactive failed"`
	Namespace    string `json:"namespace" form:"required"`
}

type DeleteDeploymentRequest struct {
	Namespace string `json:"namespace" form:"required"`
}

type GetDeploymentRequest struct {
	Namespace string `schema:"namespace" form:"required"`
}

type PullRequest struct {
	Title      string `json:"pr_title"`
	Number     uint   `json:"pr_number"`
	RepoOwner  string `json:"repo_owner"`
	RepoName   string `json:"repo_name"`
	BranchFrom string `json:"branch_from"`
	BranchInto string `json:"branch_into"`
}

type ToggleNewCommentRequest struct {
	Disable bool `json:"disable"`
}

type ListEnvironmentsResponse []*Environment

type ValidatePorterYAMLRequest struct {
	Branch string `schema:"branch"`
}

type ValidatePorterYAMLResponse struct {
	Errors []string `json:"errors"`
}
