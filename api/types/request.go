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

func WriteVerbGroup() APIVerbGroup {
	return []APIVerb{APIVerbCreate, APIVerbUpdate, APIVerbDelete}
}

type HTTPVerb string

const (
	HTTPVerbGet    HTTPVerb = "GET"
	HTTPVerbPost   HTTPVerb = "POST"
	HTTPVerbPut    HTTPVerb = "PUT"
	HTTPVerbPatch  HTTPVerb = "PUT"
	HTTPVerbDelete HTTPVerb = "DELETE"
)

type EndpointPath struct{}

type Endpoint struct {
	Parent       *Endpoint
	RelativePath EndpointPath
	Permissions  []Permission
}

type APIRequestMetadata struct {
	Verb     APIVerb
	Method   HTTPVerb
	Endpoint *Endpoint
}
