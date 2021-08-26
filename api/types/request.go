package types

type APIVerb string

const (
	APIVerbGet    APIVerb = "get"
	APIVerbCreate APIVerb = "create"
	APIVerbList   APIVerb = "list"
	APIVerbUpdate APIVerb = "update"
	APIVerbDelete APIVerb = "delete"
)

type APIVerbGroup []APIVerb

func ReadVerbGroup() APIVerbGroup {
	return []APIVerb{APIVerbGet, APIVerbList}
}

func ReadWriteVerbGroup() APIVerbGroup {
	return []APIVerb{APIVerbGet, APIVerbList, APIVerbCreate, APIVerbUpdate, APIVerbDelete}
}

type HTTPVerb string

const (
	HTTPVerbGet    HTTPVerb = "GET"
	HTTPVerbPost   HTTPVerb = "POST"
	HTTPVerbPut    HTTPVerb = "PUT"
	HTTPVerbPatch  HTTPVerb = "PUT"
	HTTPVerbDelete HTTPVerb = "DELETE"
)

type URLParam string

const (
	URLParamProjectID      URLParam = "project_id"
	URLParamClusterID      URLParam = "cluster_id"
	URLParamRegistryID     URLParam = "registry_id"
	URLParamNamespace      URLParam = "namespace"
	URLParamReleaseName    URLParam = "name"
	URLParamReleaseVersion URLParam = "version"
)

type Path struct {
	Parent       *Path
	RelativePath string
}

type APIRequestMetadata struct {
	Verb           APIVerb
	Method         HTTPVerb
	Path           *Path
	Scopes         []PermissionScope
	ShouldRedirect bool
}
