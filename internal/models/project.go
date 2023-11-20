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
	// #nosec G101 - Not actually an api token
	APITokensEnabled FeatureFlagLabel = "api_tokens_enabled"

	// AzureEnabled enables Azure Provisioning
	AzureEnabled FeatureFlagLabel = "azure_enabled"

	// CapiProvisionerEnabled enables the CAPI Provisioning flow
	CapiProvisionerEnabled FeatureFlagLabel = "capi_provisioner_enabled"

	// DBEnabled enables the "Databases" tab
	DBEnabled FeatureFlagLabel = "db_enabled"

	// EFSEnabled enables the "EFS" checkbox in App Settings
	EFSEnabled FeatureFlagLabel = "efs_enabled"

	// EnableReprovision enables the provisioning button after initial creation of the cluster
	EnableReprovision FeatureFlagLabel = "enable_reprovision"

	// FullAddOns shows all addons, not just curated
	FullAddOns FeatureFlagLabel = "full_add_ons"

	// GPUEnabled enables the "GPU for users"
	GPUEnabled FeatureFlagLabel = "gpu_enabled"

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

	// QuotaIncrease enables whether we allow for auto increase of quota_increase
	QuotaIncrease FeatureFlagLabel = "quota_increase"

	// SimplifiedViewEnabled shows the new UI dashboard or not
	SimplifiedViewEnabled FeatureFlagLabel = "simplified_view_enabled"

	// SOC2ControlsEnabled decides on whether the SOC2 Compliance UI is shown on the infrastructure tab
	SOC2ControlsEnabled FeatureFlagLabel = "soc2_controls_enabled"

	// StacksEnabled uses stack view for legacy (simplified_view_enabled=false)
	StacksEnabled FeatureFlagLabel = "stacks_enabled"

	// ValidateApplyV2 controls whether apps deploys use a porter app revision contract vs helm
	ValidateApplyV2 FeatureFlagLabel = "validate_apply_v2"

	// BetaFeaturesEnabled controls whether a project uses beta features
	BetaFeaturesEnabled FeatureFlagLabel = "beta_features_enabled"

	// AWSACKAuthEnabled controls whether a project's AWS access is governed through AWS ACK
	AWSACKAuthEnabled FeatureFlagLabel = "aws_ack_auth_enabled"
)

// ProjectFeatureFlags keeps track of all project-related feature flags
var ProjectFeatureFlags = map[FeatureFlagLabel]bool{
	APITokensEnabled:       false,
	AWSACKAuthEnabled:      false,
	AzureEnabled:           false,
	BetaFeaturesEnabled:    false,
	CapiProvisionerEnabled: true,
	DBEnabled:              false,
	EFSEnabled:             false,
	EnableReprovision:      false,
	FullAddOns:             false,
	GPUEnabled:             false,
	HelmValuesEnabled:      false,
	ManagedInfraEnabled:    false,
	MultiCluster:           false,
	PreviewEnvsEnabled:     false,
	QuotaIncrease:          false,
	RDSDatabasesEnabled:    false,
	SimplifiedViewEnabled:  true,
	SOC2ControlsEnabled:    false,
	StacksEnabled:          false,
	ValidateApplyV2:        true,
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
	if launchDarklyClient.UseDatabase() {
		// case switch things
		switch flagName {
		case "api_tokens_enabled":
			return p.APITokensEnabled
		case "azure_enabled":
			return p.AzureEnabled
		case "capi_provisioner_enabled":
			return p.CapiProvisionerEnabled
		case "db_enabled":
			return false
		case "enable_reprovision":
			return p.EnableReprovision
		case "full_add_ons":
			return p.FullAddOns
		case "gpu_enabled":
			return false
		case "helm_values_enabled":
			return p.HelmValuesEnabled
		case "managed_infra_enabled":
			return p.ManagedInfraEnabled
		case "multi_cluster":
			return p.MultiCluster
		case "preview_envs_enabled":
			return p.PreviewEnvsEnabled
		case "quota_increase":
			return false
		case "rds_databases_enabled":
			return p.RDSDatabasesEnabled
		case "simplified_view_enabled":
			return p.SimplifiedViewEnabled
		case "soc2_controls_enabled":
			return false
		case "stacks_enabled":
			return p.StacksEnabled
		case "validate_apply_v2":
			return p.ValidateApplyV2
		case "efs_enabled":
			return false
		case "aws_ack_auth_enabled":
			return false
		}
	}

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

		APITokensEnabled:       p.GetFeatureFlag(APITokensEnabled, launchDarklyClient),
		AWSACKAuthEnabled:      p.GetFeatureFlag(AWSACKAuthEnabled, launchDarklyClient),
		AzureEnabled:           p.GetFeatureFlag(AzureEnabled, launchDarklyClient),
		BetaFeaturesEnabled:    p.GetFeatureFlag(BetaFeaturesEnabled, launchDarklyClient),
		CapiProvisionerEnabled: p.GetFeatureFlag(CapiProvisionerEnabled, launchDarklyClient),
		DBEnabled:              p.GetFeatureFlag(DBEnabled, launchDarklyClient),
		EFSEnabled:             p.GetFeatureFlag(EFSEnabled, launchDarklyClient),
		EnableReprovision:      p.GetFeatureFlag(EnableReprovision, launchDarklyClient),
		FullAddOns:             p.GetFeatureFlag(FullAddOns, launchDarklyClient),
		GPUEnabled:             p.GetFeatureFlag(GPUEnabled, launchDarklyClient),
		HelmValuesEnabled:      p.GetFeatureFlag(HelmValuesEnabled, launchDarklyClient),
		ManagedInfraEnabled:    p.GetFeatureFlag(ManagedInfraEnabled, launchDarklyClient),
		MultiCluster:           p.GetFeatureFlag(MultiCluster, launchDarklyClient),
		PreviewEnvsEnabled:     p.GetFeatureFlag(PreviewEnvsEnabled, launchDarklyClient),
		QuotaIncrease:          p.GetFeatureFlag(QuotaIncrease, launchDarklyClient),
		RDSDatabasesEnabled:    p.GetFeatureFlag(RDSDatabasesEnabled, launchDarklyClient),
		SimplifiedViewEnabled:  p.GetFeatureFlag(SimplifiedViewEnabled, launchDarklyClient),
		SOC2ControlsEnabled:    p.GetFeatureFlag(SOC2ControlsEnabled, launchDarklyClient),
		StacksEnabled:          p.GetFeatureFlag(StacksEnabled, launchDarklyClient),
		ValidateApplyV2:        p.GetFeatureFlag(ValidateApplyV2, launchDarklyClient),
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
		DBEnabled:              false,
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
