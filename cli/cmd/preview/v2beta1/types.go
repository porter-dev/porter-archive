package v2beta1

type Variable struct {
	Name   *string `yaml:"name" validate:"required,unique"`
	Value  *string `yaml:"value" validate:"required_if=Random false"`
	Once   *bool   `yaml:"once"`
	Random *bool   `yaml:"random"`
	Length *uint   `yaml:"length"`
}

type EnvGroup struct {
	Name      *string `yaml:"name" validate:"required"`
	CloneFrom *string `yaml:"clone_from" validate:"required"`
}

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

type Resource struct {
	Name      *string          `yaml:"name" validate:"required,unique"`
	DependsOn []*string        `yaml:"depends_on"`
	Type      *string          `yaml:"type" validate:"required"`
	ChartURL  *string          `yaml:"chart_url" validate:"url"`
	Version   *string          `yaml:"version"`
	Build     map[*string]*any `yaml:"build"`
	Deploy    map[*string]*any `yaml:"deploy"`
}

type PorterYAML struct {
	Version   *string     `yaml:"version"`
	Variables []*Variable `yaml:"variables"`
	EnvGroups []*EnvGroup `yaml:"env_groups"`
	Builds    []*Build    `yaml:"builds"`
	Apps      []*Resource `yaml:"apps"`
	Addons    []*Resource `yaml:"addons"`
}
