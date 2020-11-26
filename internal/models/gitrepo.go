package models

import (
	"gorm.io/gorm"
)

// GitRepo is an integration that can connect to a remote git repo via an auth
// mechanism (currently only oauth)
type GitRepo struct {
	gorm.Model

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The username/organization that this repo integration is linked to
	RepoEntity string `json:"repo_entity"`

	// The various auth mechanisms available to the integration
	OAuthIntegrationID uint
}

// GitRepoExternal is a repository to be shared over REST
type GitRepoExternal struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The username/organization that this repo integration is linked to
	RepoEntity string `json:"repo_entity"`
}

// Externalize generates an external Repo to be shared over REST
func (r *GitRepo) Externalize() *GitRepoExternal {
	return &GitRepoExternal{
		ID:         r.Model.ID,
		ProjectID:  r.ProjectID,
		RepoEntity: r.RepoEntity,
	}
}
