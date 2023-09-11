package models

import (
	"fmt"

	"gorm.io/gorm"

	"github.com/launchdarkly/go-sdk-common/v3/ldcontext"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/features"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

const APITokensEnabled = "api_tokens_enabled"
const AzureEnabled = "azure_enabled"
const CapiProvisionerEnabled = "capi_provisioner_enabled"
const EnableReprovision = "enable_reprovision"
const FullAddOns = "full_add_ons"
const HelmValuesEnabled = "helm_values_enabled"
const ManagedInfraEnabled = "managed_infra_enabled"
const MultiCluster = "multi_cluster"
const PreviewEnvsEnabled = "preview_envs_enabled"
const RDSDatabasesEnabled = "rds_databases_enabled"
const SimplifiedViewEnabled = "simplified_view_enabled"
const StacksEnabled = "stacks_enabled"
const ValidateApplyV2 = "validate_apply_v2"

// ProjectFeatureFlags keeps track of all project-related feature flags
var ProjectFeatureFlags = map[string]bool{
	APITokensEnabled:       false,
	AzureEnabled:           false,
	CapiProvisionerEnabled: true,
	EnableReprovision:      false,
	FullAddOns:             false,
	HelmValuesEnabled:      false,
	ManagedInfraEnabled:    false,
	MultiCluster:           false,
	PreviewEnvsEnabled:     false,
	RDSDatabasesEnabled:    false,
	SimplifiedViewEnabled:  true,
	StacksEnabled:          false,
	ValidateApplyV2:        false,
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

		PreviewEnvsEnabled:     p.GetFeatureFlag(PreviewEnvsEnabled, launchDarklyClient),
		RDSDatabasesEnabled:    p.GetFeatureFlag(RDSDatabasesEnabled, launchDarklyClient),
		ManagedInfraEnabled:    p.GetFeatureFlag(ManagedInfraEnabled, launchDarklyClient),
		StacksEnabled:          p.GetFeatureFlag(StacksEnabled, launchDarklyClient),
		APITokensEnabled:       p.GetFeatureFlag(APITokensEnabled, launchDarklyClient),
		CapiProvisionerEnabled: p.GetFeatureFlag(CapiProvisionerEnabled, launchDarklyClient),
		SimplifiedViewEnabled:  p.GetFeatureFlag(SimplifiedViewEnabled, launchDarklyClient),
		AzureEnabled:           p.GetFeatureFlag(AzureEnabled, launchDarklyClient),
		HelmValuesEnabled:      p.GetFeatureFlag(HelmValuesEnabled, launchDarklyClient),
		MultiCluster:           p.GetFeatureFlag(MultiCluster, launchDarklyClient),
		EnableReprovision:      p.GetFeatureFlag(EnableReprovision, launchDarklyClient),
		ValidateApplyV2:        p.GetFeatureFlag(ValidateApplyV2, launchDarklyClient),
		FullAddOns:             p.GetFeatureFlag(FullAddOns, launchDarklyClient),
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
