package v2

import "github.com/porter-dev/switchboard/v2/pkg/types"

type porterAppBuild struct {
	*types.Build `yaml:",inline"`
	Ref          string
}

type porterAppDeploy struct {
	Env       map[string]string `yaml:"env" mapstructure:"env"`
	EnvGroups []string          `yaml:"env_groups" mapstructure:"env_groups"`
	Command   string            `yaml:"command" mapstructure:"command"`
	CPU       string            `yaml:"cpu" mapstructure:"cpu"`
	Memory    string            `yaml:"memory" mapstructure:"memory"`
}

type porterJob struct {
	Once bool
	Wait bool
}
