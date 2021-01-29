package forms

import (
	"github.com/porter-dev/porter/internal/models"
)

// CreateGitAction represents the accepted values for creating a
// github action integration
type CreateGitAction struct {
	ReleaseID      uint   `json:"release_id" form:"required"`
	GitRepo        string `json:"git_repo" form:"required"`
	ImageRepoURI   string `json:"image_repo_uri" form:"required"`
	DockerfilePath string `json:"dockerfile_path" form:"required"`
	GitRepoID      uint   `json:"git_repo_id" form:"required"`
}

// ToGitActionConfig converts the form to a gorm git action config model
func (ca *CreateGitAction) ToGitActionConfig() (*models.GitActionConfig, error) {
	return &models.GitActionConfig{
		ReleaseID:      ca.ReleaseID,
		GitRepo:        ca.GitRepo,
		ImageRepoURI:   ca.ImageRepoURI,
		DockerfilePath: ca.DockerfilePath,
		GitRepoID:      ca.GitRepoID,
	}, nil
}
