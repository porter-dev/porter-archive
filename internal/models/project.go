package models

import (
	"fmt"

	"gorm.io/gorm"

	"github.com/launchdarkly/go-sdk-common/v3/ldcontext"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/features"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// ProjectFeatureFlags keeps track of all project-related feature flags
var ProjectFeatureFlags = map[string]bool{
	"api_tokens_enabled":       false,
	"azure_enabled":            false,
	"capi_provisioner_enabled": true,
	"enable_reprovision":       false,
	"full_add_ons":             false,
	"helm_values_enabled":      false,
	"managed_infra_enabled":    false,
	"multi_cluster":            false,
	"preview_envs_enabled":     false,
	"rds_databases_enabled":    false,
	"simplified_view_enabled":  true,
	"stacks_enabled":           false,
	"validate_apply_v2":        false,
}

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

// GetFeatureFlag calls launchdarkly for the specified flag
// and returns the configured value
func (p *Project) GetFeatureFlag(flagName string, launchDarklyClient *features.Client) bool {
	projectID := p.ID
	projectName := p.Name
	ldContext := getProjectContext(projectID, projectName)

	defaultValue := ProjectFeatureFlags[flagName]
	value, _ := launchDarklyClient.BoolVariation(flagName, ldContext, defaultValue)
	return value
}

// ToProjectType generates an external types.Project to be shared over REST
func (p *Project) ToProjectType(launchDarklyClient *features.Client) types.Project {
	roles := make([]*types.Role, 0)

	for _, role := range p.Roles {
		roles = append(roles, role.ToRoleType())
	}

	projectID := p.ID
	projectName := p.Name

	return types.Project{
		ID:    projectID,
		Name:  projectName,
		Roles: roles,

		PreviewEnvsEnabled:     p.GetFeatureFlag("preview_envs_enabled", launchDarklyClient),
		RDSDatabasesEnabled:    p.GetFeatureFlag("rds_databases_enabled", launchDarklyClient),
		ManagedInfraEnabled:    p.GetFeatureFlag("managed_infra_enabled", launchDarklyClient),
		StacksEnabled:          p.GetFeatureFlag("stacks_enabled", launchDarklyClient),
		APITokensEnabled:       p.GetFeatureFlag("api_tokens_enabled", launchDarklyClient),
		CapiProvisionerEnabled: p.GetFeatureFlag("capi_provisioner_enabled", launchDarklyClient),
		SimplifiedViewEnabled:  p.GetFeatureFlag("simplified_view_enabled", launchDarklyClient),
		AzureEnabled:           p.GetFeatureFlag("azure_enabled", launchDarklyClient),
		HelmValuesEnabled:      p.GetFeatureFlag("helm_values_enabled", launchDarklyClient),
		MultiCluster:           p.GetFeatureFlag("multi_cluster", launchDarklyClient),
		EnableReprovision:      p.GetFeatureFlag("enable_reprovision", launchDarklyClient),
		ValidateApplyV2:        p.GetFeatureFlag("validate_apply_v2", launchDarklyClient),
		FullAddOns:             p.GetFeatureFlag("full_add_ons", launchDarklyClient),
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

func getProjectContext(projectID uint, projectName string) ldcontext.Context {
	projectIdentifier := fmt.Sprintf("project-%d", projectID)
	launchDarklyName := fmt.Sprintf("%s: %s", projectIdentifier, projectName)
	return ldcontext.NewBuilder(projectIdentifier).
		Kind("project").
		Name(launchDarklyName).
		SetInt("project_id", int(projectID)).
		Build()
}
