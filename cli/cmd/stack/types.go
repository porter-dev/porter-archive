package stack

type PorterStackYAML struct {
	Version *string           `yaml:"version"`
	Build   *Build            `yaml:"build"`
	Env     map[string]string `yaml:"env"`
	Apps    map[string]*App   `yaml:"apps"`
	Release *App              `yaml:"release"`
}

type Build struct {
	Context    *string   `yaml:"context" validate:"dir"`
	Method     *string   `yaml:"method" validate:"required,oneof=pack docker registry"`
	Builder    *string   `yaml:"builder" validate:"required_if=Method pack"`
	Buildpacks []*string `yaml:"buildpacks"`
	Dockerfile *string   `yaml:"dockerfile" validate:"required_if=Method docker"`
	Image      *string   `yaml:"image" validate:"required_if=Method registry"`
}

type App struct {
	Run    *string                `yaml:"run" validate:"required"`
	Config map[string]interface{} `yaml:"config"`
	Type   *string                `yaml:"type" validate:"required, oneof=web worker job"`
}
