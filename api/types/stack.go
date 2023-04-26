package types

type CreateStackReleaseRequest struct {
	// The Helm values for this release
	Values map[string]interface{} `json:"values"`
	// Used to construct the Chart.yaml
	Dependencies []Dependency `json:"dependencies" form:"required"`
	StackName    string       `json:"stack_name" form:"required,dns1123"`
	PorterYAML   string       `json:"porter_yaml"`
	ImageInfo    ImageInfo    `json:"image_info"`
}

type Dependency struct {
	Name       string `json:"name" form:"required"`
	Alias      string `json:"alias" form:"required"`
	Version    string `json:"version" form:"required"`
	Repository string `json:"repository" form:"required"`
}

type ImageInfo struct {
	Repository string `json:"repository"`
	Tag        string `json:"tag"`
}
