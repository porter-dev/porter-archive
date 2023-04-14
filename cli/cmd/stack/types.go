package stack

type PorterYAML struct {
	Version *string          `yaml:"version"`
	Builds  []*Build         `yaml:"builds"`
	Apps    []*AppResource   `yaml:"apps"`
	Addons  []*AddonResource `yaml:"addons"`
}
