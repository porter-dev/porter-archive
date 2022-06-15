package types

// The build configuration for this release when using buildpacks
type BuildConfig struct {
	Builder    string   `json:"builder"`
	Buildpacks []string `json:"buildpacks"`
	Config     []byte   `json:"config"`
}

// The build configuration for this new release
type CreateBuildConfigRequest struct {
	// The name of the builder to use with `pack` (Heroku or Paketo)
	// required: true
	Builder string `json:"builder" form:"required"`

	// The list of buildpacks to use for the release
	Buildpacks []string `json:"buildpacks"`

	// UNUSED
	Config map[string]interface{} `json:"config,omitempty"`
}

type UpdateBuildConfigRequest struct {
	Builder    string                 `json:"builder"`
	Buildpacks []string               `json:"buildpacks"`
	Config     map[string]interface{} `json:"config,omitempty"`
}
