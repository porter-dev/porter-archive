package types

type PermissionObject string

const (
	UserScope      PermissionObject = "user"
	ProjectScope   PermissionObject = "project"
	ClusterScope   PermissionObject = "cluster"
	NamespaceScope PermissionObject = "namespace"
)

type Permission struct {
	Object PermissionObject
	Verb   APIVerb
}

type PolicyObjectReference struct {
	Resource   PermissionObject `json:"resource"`
	Verbs      []APIVerb        `json:"verbs"`
	VerbGroups []APIVerbGroup   `json:"verb_groups"`
}

type Policy []PolicyObjectReference
