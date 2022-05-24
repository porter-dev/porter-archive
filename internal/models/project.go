package models

import (
	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/types"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

type ProjectPlan string

const (
	ProjectPlanBasic      ProjectPlan = "basic"
	ProjectPlanTeam       ProjectPlan = "team"
	ProjectPlanGrowth     ProjectPlan = "growth"
	ProjectPlanEnterprise ProjectPlan = "enterprise"
)

// Project type that extends gorm.Model
type Project struct {
	gorm.Model

	Name  string `json:"name"`
	Roles []Role `json:"roles"`

	ProjectUsageID      uint
	ProjectUsageCacheID uint

	// linked repos
	GitRepos []GitRepo `json:"git_repos,omitempty"`

	// linked registries
	Registries []Registry `json:"registries,omitempty"`

	// linked clusters
	Clusters          []Cluster          `json:"clusters"`
	ClusterCandidates []ClusterCandidate `json:"cluster_candidates"`

	// linked databases
	Databases []Database `json:"databases"`

	// linked helm repos
	HelmRepos []HelmRepo `json:"helm_repos"`

	// invitations to the project
	Invites []Invite `json:"invites"`

	// provisioned aws infra
	Infras []Infra `json:"infras"`

	// auth mechanisms
	KubeIntegrations  []ints.KubeIntegration  `json:"kube_integrations"`
	BasicIntegrations []ints.BasicIntegration `json:"basic_integrations"`
	OIDCIntegrations  []ints.OIDCIntegration  `json:"oidc_integrations"`
	OAuthIntegrations []ints.OAuthIntegration `json:"oauth_integrations"`
	AWSIntegrations   []ints.AWSIntegration   `json:"aws_integrations"`
	GCPIntegrations   []ints.GCPIntegration   `json:"gcp_integrations"`
	AzureIntegrations []ints.AzureIntegration `json:"azure_integrations"`

	PreviewEnvsEnabled  bool
	RDSDatabasesEnabled bool
	ManagedInfraEnabled bool
}

// ToProjectType generates an external types.Project to be shared over REST
func (p *Project) ToProjectType() *types.Project {
	roles := make([]*types.Role, 0)

	for _, role := range p.Roles {
		roles = append(roles, role.ToRoleType())
	}

	return &types.Project{
		ID:                  p.ID,
		Name:                p.Name,
		Roles:               roles,
		PreviewEnvsEnabled:  p.PreviewEnvsEnabled,
		RDSDatabasesEnabled: p.RDSDatabasesEnabled,
		ManagedInfraEnabled: p.ManagedInfraEnabled,
	}
}
