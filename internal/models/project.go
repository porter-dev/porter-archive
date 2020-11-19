package models

import (
	"gorm.io/gorm"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// Project type that extends gorm.Model
type Project struct {
	gorm.Model

	Name  string `json:"name"`
	Roles []Role `json:"roles"`

	// linked repos
	Repos []GitRepo `json:"git_repos,omitempty"`

	// linked clusters
	Clusters          []Cluster          `json:"clusters"`
	ClusterCandidates []ClusterCandidate `json:"cluster_candidates"`

	// auth mechanisms
	KubeIntegrations  []ints.KubeIntegration  `json:"kube_integrations"`
	OIDCIntegrations  []ints.OIDCIntegration  `json:"oidc_integrations"`
	OAuthIntegrations []ints.OAuthIntegration `json:"oauth_integrations"`
	AWSIntegrations   []ints.AWSIntegration   `json:"aws_integrations"`
	GCPIntegrations   []ints.GCPIntegration   `json:"gcp_integrations"`
}

// ProjectExternal represents the Project type that is sent over REST
type ProjectExternal struct {
	ID          uint              `json:"id"`
	Name        string            `json:"name"`
	Roles       []RoleExternal    `json:"roles"`
	RepoClients []GitRepoExternal `json:"git_repos,omitempty"`
}

// Externalize generates an external Project to be shared over REST
func (p *Project) Externalize() *ProjectExternal {
	roles := make([]RoleExternal, 0)

	for _, role := range p.Roles {
		roles = append(roles, *role.Externalize())
	}

	repos := make([]GitRepoExternal, 0)

	for _, repo := range p.Repos {
		repos = append(repos, *repo.Externalize())
	}

	return &ProjectExternal{
		ID:          p.ID,
		Name:        p.Name,
		Roles:       roles,
		RepoClients: repos,
	}
}
