package types

// BuildConfig
type BuildConfig struct {
	Builder    string   `json:"builder"`
	Buildpacks []string `json:"buildpacks"`
	Config     []byte   `json:"config"`
}

type CreateBuildConfigRequest struct {
	Builder    string                 `json:"builder" form:"required"`
	Buildpacks []string               `json:"buildpacks"`
	Config     map[string]interface{} `json:"config,omitempty"`
}

type UpdateBuildConfigRequest struct {
	Builder    string                 `json:"builder"`
	Buildpacks []string               `json:"buildpacks"`
	Config     map[string]interface{} `json:"config,omitempty"`
}
