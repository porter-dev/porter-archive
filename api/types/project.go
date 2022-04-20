package types

type Project struct {
	ID                  uint    `json:"id"`
	Name                string  `json:"name"`
	Roles               []*Role `json:"roles"`
	PreviewEnvsEnabled  bool    `json:"preview_envs_enabled"`
	RDSDatabasesEnabled bool    `json:"enable_rds_databases"`
	ManagedInfraEnabled bool    `json:"managed_infra_enabled"`
	APITokensEnabled    bool    `json:"api_tokens_enabled"`
}

type CreateProjectRequest struct {
	Name string `json:"name" form:"required"`
}

type CreateProjectResponse Project

type CreateProjectRoleRequest struct {
	Kind   string `json:"kind" form:"required"`
	UserID uint   `json:"user_id" form:"required"`
}

type ReadProjectResponse Project

type ListProjectsRequest struct{}

type ListProjectsResponse []Project

type DeleteProjectRequest struct {
	Name string `json:"name" form:"required"`
}

type DeleteProjectResponse Project

type ListProjectInfraResponse []*Infra

type GetProjectPolicyResponse []*PolicyDocument

type ListProjectRolesResponse []RoleKind

type Collaborator struct {
	ID        uint   `json:"id"`
	Kind      string `json:"kind"`
	UserID    uint   `json:"user_id"`
	Email     string `json:"email"`
	ProjectID uint   `json:"project_id"`
}

type ListCollaboratorsResponse []*Collaborator

type UpdateRoleRequest struct {
	UserID uint   `json:"user_id,required"`
	Kind   string `json:"kind,required"`
}

type UpdateRoleResponse struct {
	*Role
}

type DeleteRoleRequest struct {
	UserID uint `schema:"user_id,required"`
}

type DeleteRoleResponse struct {
	*Role
}

type GetBillingTokenResponse struct {
	Token  string `json:"token"`
	TeamID string `json:"team_id"`
}

type GetProjectBillingResponse struct {
	HasBilling bool `json:"has_billing"`
}

type StepEnum string

const (
	StepConnectSource StepEnum = "connect_source"
	StepGithub        StepEnum = "github"
)

type ConnectedSourceType string

const (
	ConnectedSourceTypeGithub = "github"
	ConnectedSourceTypeDocker = "docker"
)

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

type UpdateOnboardingRequest OnboardingData
