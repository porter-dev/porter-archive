package models

import (
	"gorm.io/gorm"
)

// The allowed repository clients
const (
	RepoClientGithub = "github"
)

// RepoClient is a client for a set of repositories that has been added
// via a project OAuth flow
type RepoClient struct {
	gorm.Model

	ProjectID  uint `json:"project_id"`
	UserID     uint `json:"user_id"`
	RepoUserID uint `json:"repo_id"`

	// the kind can be one of the predefined repo kinds
	Kind string `json:"kind"`

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	AccessToken  []byte `json:"access_token"`
	RefreshToken []byte `json:"refresh_token"`
}

// RepoClientExternal is a RepoClient scrubbed of sensitive information to be
// shared over REST
type RepoClientExternal struct {
	ID         uint   `json:"id"`
	ProjectID  uint   `json:"project_id"`
	UserID     uint   `json:"user_id"`
	RepoUserID uint   `json:"repo_id"`
	Kind       string `json:"kind"`
}

// Externalize generates an external RepoClient to be shared over REST
func (r *RepoClient) Externalize() *RepoClientExternal {
	return &RepoClientExternal{
		ID:         r.Model.ID,
		ProjectID:  r.ProjectID,
		UserID:     r.UserID,
		RepoUserID: r.RepoUserID,
		Kind:       r.Kind,
	}
}
