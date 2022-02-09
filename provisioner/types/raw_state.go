package types

const DefaultTerraformStateFile = "default.tfstate"

type RawTFState struct {
	Version          int         `json:"version"`
	TerraformVersion string      `json:"terraform_version"`
	Serial           int         `json:"serial"`
	Lineage          string      `json:"lineage"`
	Outputs          interface{} `json:"outputs"`
	Resources        interface{} `json:"resources"`
}

type ParseableRawTFState struct {
	Version          int                  `json:"version"`
	TerraformVersion string               `json:"terraform_version"`
	Serial           int                  `json:"serial"`
	Lineage          string               `json:"lineage"`
	Outputs          interface{}          `json:"outputs"`
	Resources        []RawTFStateResource `json:"resources"`
}

type RawTFStateResource struct {
	Instances []RawTFStateInstance `json:"instances"`
	Mode      string               `json:"mode"`
	Name      string               `json:"name"`
	Provider  string               `json:"provider"`
	Type      string               `json:"type"`
}

type RawTFStateInstance struct {
	Attributes   map[string]interface{} `json:"attributes"`
	Dependencies []string               `json:"dependencies"`
}
