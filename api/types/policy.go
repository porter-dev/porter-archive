package types

import "time"

type PermissionScope string

const (
	UserScope              PermissionScope = "user"
	ProjectScope           PermissionScope = "project"
	ClusterScope           PermissionScope = "cluster"
	RegistryScope          PermissionScope = "registry"
	InviteScope            PermissionScope = "invite"
	HelmRepoScope          PermissionScope = "helm_repo"
	InfraScope             PermissionScope = "infra"
	OperationScope         PermissionScope = "operation"
	GitInstallationScope   PermissionScope = "git_installation"
	NamespaceScope         PermissionScope = "namespace"
	SettingsScope          PermissionScope = "settings"
	ReleaseScope           PermissionScope = "release"
	StackScope             PermissionScope = "stack"
	GitlabIntegrationScope PermissionScope = "gitlab_integration"
)

type NameOrUInt struct {
	Name string `json:"name"`
	UInt uint   `json:"uint"`
}

type PolicyDocument struct {
	Scope     PermissionScope                     `json:"scope"`
	Resources []NameOrUInt                        `json:"resources"`
	Verbs     []APIVerb                           `json:"verbs"`
	Children  map[PermissionScope]*PolicyDocument `json:"children"`
}

type ScopeTree map[PermissionScope]ScopeTree

/* ScopeHeirarchy describes the tree of scopes, i.e. Cluster, Registry, and Settings
are children of Project, Namespace is a child of Cluster, etc.
*/
var ScopeHeirarchy = ScopeTree{
	ProjectScope: {
		ClusterScope: {
			NamespaceScope: {
				StackScope:   {},
				ReleaseScope: {},
			},
		},
		RegistryScope:        {},
		HelmRepoScope:        {},
		GitInstallationScope: {},
		InfraScope: {
			OperationScope: {},
		},
		SettingsScope: {},
	},
}

type Policy []*PolicyDocument

var AdminPolicy = []*PolicyDocument{
	{
		Scope: ProjectScope,
		Verbs: ReadWriteVerbGroup(),
		Children: map[PermissionScope]*PolicyDocument{
			ClusterScope: {
				Scope: ClusterScope,
				Verbs: ReadWriteVerbGroup(),
			},
			RegistryScope: {
				Scope: RegistryScope,
				Verbs: ReadWriteVerbGroup(),
			},
			HelmRepoScope: {
				Scope: HelmRepoScope,
				Verbs: ReadWriteVerbGroup(),
			},
			GitInstallationScope: {
				Scope: GitInstallationScope,
				Verbs: ReadWriteVerbGroup(),
			},
			InfraScope: {
				Scope: InfraScope,
				Verbs: ReadWriteVerbGroup(),
			},
			SettingsScope: {
				Scope: SettingsScope,
				Verbs: ReadWriteVerbGroup(),
			},
		},
	},
}

var DeveloperPolicy = []*PolicyDocument{
	{
		Scope: ProjectScope,
		Verbs: ReadWriteVerbGroup(),
		Children: map[PermissionScope]*PolicyDocument{
			ClusterScope: {
				Scope: ClusterScope,
				Verbs: ReadWriteVerbGroup(),
			},
			RegistryScope: {
				Scope: RegistryScope,
				Verbs: ReadWriteVerbGroup(),
			},
			HelmRepoScope: {
				Scope: HelmRepoScope,
				Verbs: ReadWriteVerbGroup(),
			},
			GitInstallationScope: {
				Scope: GitInstallationScope,
				Verbs: ReadWriteVerbGroup(),
			},
			InfraScope: {
				Scope: InfraScope,
				Verbs: ReadWriteVerbGroup(),
			},
			SettingsScope: {
				Scope: SettingsScope,
				Verbs: ReadVerbGroup(),
			},
		},
	},
}

var ViewerPolicy = []*PolicyDocument{
	{
		Scope: ProjectScope,
		Verbs: ReadVerbGroup(),
		Children: map[PermissionScope]*PolicyDocument{
			ClusterScope: {
				Scope: ClusterScope,
				Verbs: ReadVerbGroup(),
			},
			RegistryScope: {
				Scope: RegistryScope,
				Verbs: ReadVerbGroup(),
			},
			HelmRepoScope: {
				Scope: HelmRepoScope,
				Verbs: ReadVerbGroup(),
			},
			GitInstallationScope: {
				Scope: GitInstallationScope,
				Verbs: ReadVerbGroup(),
			},
			InfraScope: {
				Scope: InfraScope,
				Verbs: ReadVerbGroup(),
			},
			SettingsScope: {
				Scope: SettingsScope,
				Verbs: []APIVerb{},
			},
		},
	},
}

type CreatePolicy struct {
	Name   string            `json:"name" form:"required"`
	Policy []*PolicyDocument `json:"policy" form:"required"`
}

const URLParamPolicyID URLParam = "policy_id"

type APIPolicyMeta struct {
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	ProjectID uint      `json:"project_id"`
	UID       string    `json:"uid"`
	Name      string    `json:"name"`
}

type APIPolicy struct {
	*APIPolicyMeta
	Policy []*PolicyDocument `json:"policy"`
}
