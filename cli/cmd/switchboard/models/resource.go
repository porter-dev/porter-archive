package models

type ResourceGroup struct {
	APIVersion string
	Resources  []*Resource
}

type Resource struct {
	Name         string
	Driver       string
	Config       map[string]interface{}
	Source       map[string]interface{}
	Target       map[string]interface{}
	Dependencies []string
}
