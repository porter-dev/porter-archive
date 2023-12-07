package types

// ProjectList type for entries in the api response on GET /projects
type ProjectList struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`

	// note: all of these fields should be considered deprecated
	// in an api response
	Roles                  []Role `json:"roles"`
	PreviewEnvsEnabled     bool   `json:"preview_envs_enabled"`
	RDSDatabasesEnabled    bool   `json:"enable_rds_databases"`
	ManagedInfraEnabled    bool   `json:"managed_infra_enabled"`
	APITokensEnabled       bool   `json:"api_tokens_enabled"`
	StacksEnabled          bool   `json:"stacks_enabled"`
	CapiProvisionerEnabled bool   `json:"capi_provisioner_enabled"`
	DBEnabled              bool   `json:"db_enabled"`
	SimplifiedViewEnabled  bool   `json:"simplified_view_enabled"`
	AzureEnabled           bool   `json:"azure_enabled"`
	HelmValuesEnabled      bool   `json:"helm_values_enabled"`
	MultiCluster           bool   `json:"multi_cluster"`
	FullAddOns             bool   `json:"full_add_ons"`
	EnableReprovision      bool   `json:"enable_reprovision"`
	ValidateApplyV2        bool   `json:"validate_apply_v2"`
}

// Project type for entries in api responses for everything other than `GET /projects`
type Project struct {
	ID                              uint    `json:"id"`
	Name                            string  `json:"name"`
	Roles                           []*Role `json:"roles"`
	APITokensEnabled                bool    `json:"api_tokens_enabled"`
	AWSACKAuthEnabled               bool    `json:"aws_ack_auth_enabled"`
	AzureEnabled                    bool    `json:"azure_enabled"`
	BetaFeaturesEnabled             bool    `json:"beta_features_enabled"`
	CapiProvisionerEnabled          bool    `json:"capi_provisioner_enabled"`
	DBEnabled                       bool    `json:"db_enabled"`
	EFSEnabled                      bool    `json:"efs_enabled"`
	EnableReprovision               bool    `json:"enable_reprovision"`
	FullAddOns                      bool    `json:"full_add_ons"`
	GPUEnabled                      bool    `json:"gpu_enabled"`
	HelmValuesEnabled               bool    `json:"helm_values_enabled"`
	ManagedInfraEnabled             bool    `json:"managed_infra_enabled"`
	MultiCluster                    bool    `json:"multi_cluster"`
	PreviewEnvsEnabled              bool    `json:"preview_envs_enabled"`
	QuotaIncrease                   bool    `json:"quota_increase"`
	RDSDatabasesEnabled             bool    `json:"enable_rds_databases"`
	SimplifiedViewEnabled           bool    `json:"simplified_view_enabled"`
	SOC2ControlsEnabled             bool    `json:"soc2_controls_enabled"`
	StacksEnabled                   bool    `json:"stacks_enabled"`
	ValidateApplyV2                 bool    `json:"validate_apply_v2"`
	ManagedDeploymentTargetsEnabled bool    `json:"managed_deployment_targets_enabled"`
}

// FeatureFlags is a struct that contains old feature flag representations
//
// Deprecated: Add the feature flag to the `Project` struct instead and
// retrieve feature flags from the `GET /projects/{project_id}` response instead
type FeatureFlags struct {
	AzureEnabled                    bool   `json:"azure_enabled,omitempty"`
	CapiProvisionerEnabled          string `json:"capi_provisioner_enabled,omitempty"`
	EnableReprovision               bool   `json:"enable_reprovision,omitempty"`
	FullAddOns                      bool   `json:"full_add_ons,omitempty"`
	HelmValuesEnabled               bool   `json:"helm_values_enabled,omitempty"`
	ManagedDatabasesEnabled         string `json:"managed_databases_enabled,omitempty"`
	ManagedInfraEnabled             string `json:"managed_infra_enabled,omitempty"`
	MultiCluster                    bool   `json:"multi_cluster,omitempty"`
	PreviewEnvironmentsEnabled      string `json:"preview_environments_enabled,omitempty"`
	SimplifiedViewEnabled           string `json:"simplified_view_enabled,omitempty"`
	StacksEnabled                   string `json:"stacks_enabled,omitempty"`
	ValidateApplyV2                 bool   `json:"validate_apply_v2"`
	ManagedDeploymentTargetsEnabled bool   `json:"managed_deployment_targets_enabled"`
}

// CreateProjectRequest is a struct that contains the information
// necessary to seed a project
type CreateProjectRequest struct {
	Name string `json:"name" form:"required"`
}

// CreateProjectResponse is a struct that contains the response from a create project call
type CreateProjectResponse Project

// CreateProjectRoleRequest is a struct that contains the information needed to set a role on a user
type CreateProjectRoleRequest struct {
	Kind   string `json:"kind" form:"required"`
	UserID uint   `json:"user_id" form:"required"`
}

// ProjectInviteAdminRequest is a struct that contains the information needed to invite an admin to a project
type ProjectInviteAdminRequest struct{}

// ReadProjectResponse is a struct that contains the response from a `GET /projects/{project_id}` request
type ReadProjectResponse Project

// ListProjectsRequest is a struct that contains the information needed to make a `GET /projects` request
type ListProjectsRequest struct{}

// ListProjectsResponse is a struct that contains the response from a `GET /projects` request
type ListProjectsResponse []Project

// DeleteProjectRequest is a struct that contains the information needed to make a `DELETE /projects` request
type DeleteProjectRequest struct {
	Name string `json:"name" form:"required"`
}

// DeleteProjectResponse is a struct that contains the response from a `DELETE /projects` request
type DeleteProjectResponse Project

// ListProjectInfraResponse is a struct that contains the response from a `GET projects/{project_id}/infra` request
type ListProjectInfraResponse []*Infra

// GetProjectPolicyResponse is a struct that contains the response from a `GET projects/{project_id}/policy` request
type GetProjectPolicyResponse []*PolicyDocument

// ListProjectRolesResponse is a struct that contains the response from a `GET projects/{project_id}/roles` request
type ListProjectRolesResponse []RoleKind

// Collaborator is a struct defining a collaborator on a project
type Collaborator struct {
	ID        uint   `json:"id"`
	Kind      string `json:"kind"`
	UserID    uint   `json:"user_id"`
	Email     string `json:"email"`
	ProjectID uint   `json:"project_id"`
}

// ListCollaboratorsResponse is a struct that contains the response from a `GET projects/{project_id}/collaborators` request
type ListCollaboratorsResponse []*Collaborator

// UpdateRoleRequest is a struct that contains the information needed to make a `POST projects/{project_id}/roles` request
type UpdateRoleRequest struct {
	UserID uint   `json:"user_id,required"`
	Kind   string `json:"kind,required"`
}

// UpdateRoleResponse is a struct that contains the response from a `POST projects/{project_id}/roles` request
type UpdateRoleResponse struct {
	*Role
}

// DeleteRoleRequest is a struct that contains the response from a `DELETE projects/{project_id}/roles` request
type DeleteRoleRequest struct {
	UserID uint `schema:"user_id,required"`
}

// DeleteRoleResponse is a struct that contains the response from a `DELETE projects/{project_id}/roles` request
type DeleteRoleResponse struct {
	*Role
}

// GetProjectBillingResponse is a struct that contains the response from a `GET projects/{project_id}/billing` request
type GetProjectBillingResponse struct {
	HasBilling bool `json:"has_billing"`
}

// StepEnum is a type describing the current onboarding step
type StepEnum string

const (
	// StepConnectSource is a value describing the current onboarding step as `connect_source` (the first step)
	StepConnectSource StepEnum = "connect_source"
)

// ConnectedSourceType describes the source of an onboarding
type ConnectedSourceType string

const (
	// ConnectedSourceTypeGithub is the github source
	ConnectedSourceTypeGithub = "github"
	// ConnectedSourceTypeDocker is the docker source
	ConnectedSourceTypeDocker = "docker"
)

// OnboardingData is an onboarding step
type OnboardingData struct {
	CurrentStep                    StepEnum            `json:"current_step"`
	ConnectedSource                ConnectedSourceType `json:"connected_source"`
	SkipRegistryConnection         bool                `json:"skip_registry_connection"`
	SkipResourceProvision          bool                `json:"skip_resource_provision"`
	RegistryConnectionID           uint                `json:"registry_connection_id"`
	RegistryConnectionCredentialID uint                `json:"registry_connection_credential_id"`
	RegistryConnectionProvider     string              `json:"registry_connection_provider"`
	RegistryInfraID                uint                `json:"registry_infra_id"`
	RegistryInfraCredentialID      uint                `json:"registry_infra_credential_id"`
	RegistryInfraProvider          string              `json:"registry_infra_provider"`
	ClusterInfraID                 uint                `json:"cluster_infra_id"`
	ClusterInfraCredentialID       uint                `json:"cluster_infra_credential_id"`
	ClusterInfraProvider           string              `json:"cluster_infra_provider"`
}

// UpdateOnboardingRequest is a struct that contains the information needed to make a `POST projects/{project_id}/onboarding` request
type UpdateOnboardingRequest OnboardingData

// UpdateOnboardingStepRequest is a struct that contains the information needed to make a `POST projects/{project_id}/onboarding_step` request
type UpdateOnboardingStepRequest struct {
	Step              string `json:"step" form:"required,max=255"`
	Provider          string `json:"provider"`
	AccountId         string `json:"account_id"`
	CloudformationURL string `json:"cloudformation_url"`
	ErrorMessage      string `json:"error_message"`
	LoginURL          string `json:"login_url"`
	Region            string `json:"region"`
	// ExternalId used as a 'password' for the aws assume role chain to porter-manager role
	ExternalId string `json:"external_id"`
}

// UpdateProjectNameRequest takes in a name to rename projects
type UpdateProjectNameRequest struct {
	Name string `json:"name" form:"required"`
}
