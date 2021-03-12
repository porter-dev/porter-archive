package forms

import (
	"github.com/porter-dev/porter/internal/models"
)

// CreateGitAction represents the accepted values for creating a
// github action integration
type CreateGitAction struct {
	ReleaseID      uint              `json:"release_id" form:"required"`
	GitRepo        string            `json:"git_repo" form:"required"`
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
		ImageRepoURI:   ca.ImageRepoURI,
		DockerfilePath: ca.DockerfilePath,
		FolderPath:     ca.FolderPath,
		GitRepoID:      ca.GitRepoID,
	}, nil
}

type CreateGitActionOptional struct {
	GitRepo        string            `json:"git_repo"`
	ImageRepoURI   string            `json:"image_repo_uri"`
	DockerfilePath string            `json:"dockerfile_path"`
	FolderPath     string            `json:"folder_path"`
	GitRepoID      uint              `json:"git_repo_id"`
	BuildEnv       map[string]string `json:"env"`
	RegistryID     uint              `json:"registry_id"`
}
