package models

import (
	"fmt"

	"gorm.io/gorm"

	"github.com/launchdarkly/go-sdk-common/v3/ldcontext"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/features"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// FeatureFlagLabel strongly types project feature flags
type FeatureFlagLabel string

const (
	// APITokensEnabled allows users to create Bearer tokens for use with the Porter API
	APITokensEnabled FeatureFlagLabel = "api_tokens_enabled"

	// AzureEnabled enables Azure Provisioning
	AzureEnabled FeatureFlagLabel = "azure_enabled"

	// CapiProvisionerEnabled enables the CAPI Provisioning flow
	CapiProvisionerEnabled FeatureFlagLabel = "capi_provisioner_enabled"

	// EnableReprovision enables the provisioning button after initial creation of the cluster
	EnableReprovision FeatureFlagLabel = "enable_reprovision"

	// FullAddOns shows all addons, not just curated
	FullAddOns FeatureFlagLabel = "full_add_ons"

	// HelmValuesEnabled shows the helm values tab for porter apps (when simplified_view_enabled=true)
	HelmValuesEnabled FeatureFlagLabel = "helm_values_enabled"

	// ManagedInfraEnabled uses terraform provisioning instead of capi
	ManagedInfraEnabled FeatureFlagLabel = "managed_infra_enabled"

	// MultiCluster allows multiple clusters in simplified view (simplified_view_enabled=true)
	MultiCluster FeatureFlagLabel = "multi_cluster"

	// PreviewEnvsEnabled allows legacy user the ability to see preview environments in sidebar (simplified_view_enabled=false)
	PreviewEnvsEnabled FeatureFlagLabel = "preview_envs_enabled"

	// RDSDatabasesEnabled allows for users to provision RDS instances within their cluster vpc
	RDSDatabasesEnabled FeatureFlagLabel = "rds_databases_enabled"

	// SimplifiedViewEnabled shows the new UI dashboard or not
	SimplifiedViewEnabled FeatureFlagLabel = "simplified_view_enabled"

	// StacksEnabled uses stack view for legacy (simplified_view_enabled=false)
	StacksEnabled FeatureFlagLabel = "stacks_enabled"

	// ValidateApplyV2 controls whether apps deploys use a porter app revision contract vs helm
	ValidateApplyV2 FeatureFlagLabel = "validate_apply_v2"
)

// ProjectFeatureFlags keeps track of all project-related feature flags
var ProjectFeatureFlags = map[FeatureFlagLabel]bool{
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

	// Deprecated: use p.GetFeatureFlag(PreviewEnvsEnabled, *features.Client) instead
	PreviewEnvsEnabled bool

	// Deprecated: use p.GetFeatureFlag(RDSDatabasesEnabled, *features.Client) instead

	RDSDatabasesEnabled bool
	// Deprecated: use p.GetFeatureFlag(ManagedInfraEnabled, *features.Client) instead

	ManagedInfraEnabled bool
	// Deprecated: use p.GetFeatureFlag(StacksEnabled, *features.Client) instead

	StacksEnabled bool
	// Deprecated: use p.GetFeatureFlag(APITokensEnabled, *features.Client) instead

	APITokensEnabled bool
	// Deprecated: use p.GetFeatureFlag(CapiProvisionerEnabled, *features.Client) instead

	CapiProvisionerEnabled bool
	// Deprecated: use p.GetFeatureFlag(SimplifiedViewEnabled, *features.Client) instead

	SimplifiedViewEnabled bool
	// Deprecated: use p.GetFeatureFlag(AzureEnabled, *features.Client) instead

	AzureEnabled bool
	// Deprecated: use p.GetFeatureFlag(HelmValuesEnabled, *features.Client) instead

	HelmValuesEnabled bool
	// Deprecated: use p.GetFeatureFlag(MultiCluster, *features.Client) instead

	MultiCluster bool `gorm:"default:false"`
	// Deprecated: use p.GetFeatureFlag(FullAddOns, *features.Client) instead

	FullAddOns bool `gorm:"default:false"`
	// Deprecated: use p.GetFeatureFlag(ValidateApplyV2, *features.Client) instead

	ValidateApplyV2 bool `gorm:"default:false"`
	// Deprecated: use p.GetFeatureFlag(EnableReprovision, *features.Client) instead

	EnableReprovision bool `gorm:"default:false"`
}

// GetFeatureFlag calls launchdarkly for the specified flag
// and returns the configured value
func (p *Project) GetFeatureFlag(flagName FeatureFlagLabel, launchDarklyClient *features.Client) bool {
	projectID := p.ID
	projectName := p.Name
	ldContext := getProjectContext(projectID, projectName)

	defaultValue := ProjectFeatureFlags[flagName]
	value, _ := launchDarklyClient.BoolVariation(string(flagName), ldContext, defaultValue)
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
