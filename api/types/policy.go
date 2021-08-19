package types

type PermissionScope string

const (
	UserScope        PermissionScope = "user"
	ProjectScope     PermissionScope = "project"
	ClusterScope     PermissionScope = "cluster"
	NamespaceScope   PermissionScope = "namespace"
	SettingsScope    PermissionScope = "settings"
	ApplicationScope PermissionScope = "application"
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

/* ScopeHeirarchy describes the scope tree:
<<<<<<< HEAD

=======
>>>>>>> master
			Project
		   /	   \
		Cluster   Settings
		/
	Namespace
       |
	 Release
*/
var ScopeHeirarchy = ScopeTree{
	ProjectScope: {
		ClusterScope: {
			NamespaceScope: {
				ApplicationScope: {},
			},
		},
		SettingsScope: {},
	},
}

type Policy []*PolicyDocument

var AdminPolicy = []*PolicyDocument{
	{
		Scope: ProjectScope,
		Verbs: ReadWriteVerbGroup(),
	},
}

var DeveloperPolicy = []*PolicyDocument{
	{
		Scope: ProjectScope,
		Verbs: ReadWriteVerbGroup(),
		Children: map[PermissionScope]*PolicyDocument{
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
			SettingsScope: {
				Scope: SettingsScope,
				Verbs: []APIVerb{},
			},
		},
	},
}
