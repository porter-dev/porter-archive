package v2beta1

// type Variable struct {
// 	Name   *string `yaml:"name" validate:"required,unique"`
// 	Value  *string `yaml:"value" validate:"required_if=Random false"`
// 	Once   *bool   `yaml:"once"`
// 	Random *bool   `yaml:"random"`
// 	Length *uint   `yaml:"length"`
// }

// type EnvGroup struct {
// 	Name      *string `yaml:"name" validate:"required"`
// 	CloneFrom *string `yaml:"clone_from" validate:"required"`
// }

type BuildEnv struct {
	Raw        map[*string]*string `yaml:"raw"`
	ImportFrom []*string           `yaml:"import_from"`
}

type Build struct {
	Name       *string   `yaml:"name" validate:"required"`
	Context    *string   `yaml:"context" validate:"dir"`
	Method     *string   `yaml:"method" validate:"required,oneof=pack docker registry"`
	Builder    *string   `yaml:"builder" validate:"required_if=Method pack"`
	Buildpacks []*string `yaml:"buildpacks"`
	Dockerfile *string   `yaml:"dockerfile" validate:"required_if=Method docker"`
	Image      *string   `yaml:"image" validate:"required_if=Method registry"`
	Env        *BuildEnv `yaml:"env"`
	// UseCache   *bool     `yaml:"use_cache"`
}

type HelmChart struct {
	URL     *string `yaml:"url" validate:"url"`
	Name    *string `yaml:"name" validate:"required"`
	Version *string `yaml:"version"`
}

type AppResource struct {
	Name      *string    `yaml:"name" validate:"required"`
	DependsOn []*string  `yaml:"depends_on"`
	Chart     *HelmChart `yaml:"helm_chart"`
	BuildRef  *string    `yaml:"build_ref"`
	// Deploy     map[*string]*any `yaml:"deploy"`
	HelmValues map[string]any `yaml:"helm_values"`
	RunOnce    *bool          `yaml:"run_once"`
}

type AddonResource struct {
	Name       *string        `yaml:"name" validate:"required"`
	DependsOn  []*string      `yaml:"depends_on"`
	Chart      *HelmChart     `yaml:"helm_chart" validate:"required"`
	HelmValues map[string]any `yaml:"helm_values"`
}

type PorterYAML struct {
	Version *string `yaml:"version"`
	// Variables []*Variable `yaml:"variables"`
	// EnvGroups []*EnvGroup `yaml:"env_groups"`
	Builds []*Build         `yaml:"builds"`
	Apps   []*AppResource   `yaml:"apps"`
	Addons []*AddonResource `yaml:"addons"`
}
