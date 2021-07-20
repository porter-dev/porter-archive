package forms

import (
	"github.com/porter-dev/porter/internal/models"
)

// CreateGitAction represents the accepted values for creating a
// github action integration
type CreateGitAction struct {
	ReleaseID      uint              `json:"release_id" form:"required"`
	GitRepo        string            `json:"git_repo" form:"required"`
	GitBranch      string            `json:"git_branch"`
	ImageRepoURI   string            `json:"image_repo_uri" form:"required"`
	DockerfilePath string            `json:"dockerfile_path"`
	FolderPath     string            `json:"folder_path"`
	GitRepoID      uint              `json:"git_repo_id" form:"required"`
	BuildEnv       map[string]string `json:"env"`
	RegistryID     uint              `json:"registry_id"`
}

// ToGitActionConfig converts the form to a gorm git action config model
func (ca *CreateGitAction) ToGitActionConfig() (*models.GitActionConfig, error) {
	return &models.GitActionConfig{
		ReleaseID:      ca.ReleaseID,
		GitRepo:        ca.GitRepo,
		GitBranch:      ca.GitBranch,
		ImageRepoURI:   ca.ImageRepoURI,
		DockerfilePath: ca.DockerfilePath,
		FolderPath:     ca.FolderPath,
		GitRepoID:      ca.GitRepoID,
		IsInstallation: true,
	}, nil
}

type CreateGitActionOptional struct {
	GitRepo        string            `json:"git_repo"`
	GitBranch      string            `json:"git_branch"`
	ImageRepoURI   string            `json:"image_repo_uri"`
	DockerfilePath string            `json:"dockerfile_path"`
	FolderPath     string            `json:"folder_path"`
	GitRepoID      uint              `json:"git_repo_id"`
	BuildEnv       map[string]string `json:"env"`
	RegistryID     uint              `json:"registry_id"`
}
