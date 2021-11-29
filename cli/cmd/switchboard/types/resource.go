package types

type ResourceGroup struct {
	Version   string      `json:"version"`
	Resources []*Resource `json:"resources"`
}

type Resource struct {
	Name      string                 `json:"name"`
	Driver    string                 `json:"driver"`
	Source    map[string]interface{} `json:"source"`
	Target    map[string]interface{} `json:"target"`
	Config    map[string]interface{} `json:"config"`
	DependsOn []string               `json:"depends_on"`
}
