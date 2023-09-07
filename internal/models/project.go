package models

import (
	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/features"
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
	gorm.Model `gorm:"embedded"`

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
	KubeIntegrations   []ints.KubeIntegration   `json:"kube_integrations"`
	BasicIntegrations  []ints.BasicIntegration  `json:"basic_integrations"`
	OIDCIntegrations   []ints.OIDCIntegration   `json:"oidc_integrations"`
	OAuthIntegrations  []ints.OAuthIntegration  `json:"oauth_integrations"`
	AWSIntegrations    []ints.AWSIntegration    `json:"aws_integrations"`
	GCPIntegrations    []ints.GCPIntegration    `json:"gcp_integrations"`
	AzureIntegrations  []ints.AzureIntegration  `json:"azure_integrations"`
	GitlabIntegrations []ints.GitlabIntegration `json:"gitlab_integrations"`

	PreviewEnvsEnabled     bool
	RDSDatabasesEnabled    bool
	ManagedInfraEnabled    bool
	StacksEnabled          bool
	APITokensEnabled       bool
	CapiProvisionerEnabled bool
	SimplifiedViewEnabled  bool
	AzureEnabled           bool
	HelmValuesEnabled      bool
	MultiCluster           bool `gorm:"default:false"`
	FullAddOns             bool `gorm:"default:false"`
	ValidateApplyV2        bool `gorm:"default:false"`
	EnableReprovision      bool `gorm:"default:false"`
}

// ToProjectType generates an external types.Project to be shared over REST
func (p *Project) ToProjectType(launchDarklyClient *features.Client) types.Project {
	roles := make([]*types.Role, 0)

	for _, role := range p.Roles {
		roles = append(roles, role.ToRoleType())
	}

	projectID := p.ID
	projectName := p.Name
	ldContext := getProjectContext(projectID, projectName)

	return types.Project{
		ID:    projectID,
		Name:  projectName,
		Roles: roles,

		PreviewEnvsEnabled:     getPreviewEnvsEnabled(ldContext, launchDarklyClient),
		RDSDatabasesEnabled:    getRdsDatabasesEnabled(ldContext, launchDarklyClient),
		ManagedInfraEnabled:    getManagedInfraEnabled(ldContext, launchDarklyClient),
		StacksEnabled:          getStacksEnabled(ldContext, launchDarklyClient),
		APITokensEnabled:       getAPITokensEnabled(ldContext, launchDarklyClient),
		CapiProvisionerEnabled: getCapiProvisionerEnabled(ldContext, launchDarklyClient),
		SimplifiedViewEnabled:  getSimplifiedViewEnabled(ldContext, launchDarklyClient),
		AzureEnabled:           getAzureEnabled(ldContext, launchDarklyClient),
		HelmValuesEnabled:      getHelmValuesEnabled(ldContext, launchDarklyClient),
		MultiCluster:           getMultiCluster(ldContext, launchDarklyClient),
		EnableReprovision:      getEnableReprovision(ldContext, launchDarklyClient),
		ValidateApplyV2:        getValidateApplyV2(ldContext, launchDarklyClient),
		FullAddOns:             getFullAddOns(ldContext, launchDarklyClient),
	}
}

// ToProjectListType returns a "minified" version of a Project
// suitable for api responses to GET /projects
// TODO: update this in the future to use default values for all
// the feature flags instead of trying to retrieve them from the database
func (p *Project) ToProjectListType() *types.ProjectList {
	var roles []types.Role
	for _, role := range p.Roles {
		roles = append(roles, *role.ToRoleType())
	}

	return &types.ProjectList{
		ID:   p.ID,
		Name: p.Name,

		// note: all of these fields should be considered deprecated
		// in an api response
		Roles:                  roles,
		PreviewEnvsEnabled:     p.PreviewEnvsEnabled,
		RDSDatabasesEnabled:    p.RDSDatabasesEnabled,
		ManagedInfraEnabled:    p.ManagedInfraEnabled,
		StacksEnabled:          p.StacksEnabled,
		APITokensEnabled:       p.APITokensEnabled,
		CapiProvisionerEnabled: p.CapiProvisionerEnabled,
		SimplifiedViewEnabled:  p.SimplifiedViewEnabled,
		AzureEnabled:           p.AzureEnabled,
		HelmValuesEnabled:      p.HelmValuesEnabled,
		MultiCluster:           p.MultiCluster,
		EnableReprovision:      p.EnableReprovision,
		ValidateApplyV2:        p.ValidateApplyV2,
		FullAddOns:             p.FullAddOns,
	}
}
