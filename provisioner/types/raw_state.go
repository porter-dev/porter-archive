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
