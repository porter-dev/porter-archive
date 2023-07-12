package stack

type PorterStackYAML struct {
	Applications map[string]*Application `yaml:"applications" validate:"required_without=Services Apps"`
	Version      *string                 `yaml:"version"`
	Build        *Build                  `yaml:"build"`
	Env          map[string]string       `yaml:"env"`
	Apps         map[string]*Service     `yaml:"apps" validate:"required_without=Applications Services"`
	Services     map[string]*Service     `yaml:"services" validate:"required_without=Applications Apps"`

	Release *Service `yaml:"release"`
}

type Application struct {
	Services map[string]*Service `yaml:"services" validate:"required"`
	Build    *Build              `yaml:"build"`
	Env      map[string]string   `yaml:"env"`

	Release *Service `yaml:"release"`
}

type Build struct {
	Context    *string   `yaml:"context" validate:"dir"`
	Method     *string   `yaml:"method" validate:"required,oneof=pack docker registry"`
	Builder    *string   `yaml:"builder" validate:"required_if=Method pack"`
	Buildpacks []*string `yaml:"buildpacks"`
	Dockerfile *string   `yaml:"dockerfile" validate:"required_if=Method docker"`
	Image      *string   `yaml:"image" validate:"required_if=Method registry"`
}

type Service struct {
	Run    *string                `yaml:"run" validate:"required"`
	Config map[string]interface{} `yaml:"config"`
	Type   *string                `yaml:"type" validate:"required, oneof=web worker job"`
}
