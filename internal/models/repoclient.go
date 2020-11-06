package models

import (
	"strings"

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

	ProjectID uint `json:"project_id"`

	// the kind can be one of the predefined repo kinds
	Kind         string `json:"kind"`
	Repositories string `json:"repositories"`

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// RepoClientExternal is a RepoClient scrubbed of sensitive information to be
// shared over REST
type RepoClientExternal struct {
	ID           uint     `json:"id"`
	ProjectID    uint     `json:"project_id"`
	Kind         string   `json:"kind"`
	Repositories []string `json:"repositories"`
}

// Externalize generates an external RepoClient to be shared over REST
func (r *RepoClient) Externalize() *RepoClientExternal {
	return &RepoClientExternal{
		ID:           r.Model.ID,
		ProjectID:    r.ProjectID,
		Kind:         r.Kind,
		Repositories: strings.Split(r.Repositories, ","),
	}
}
