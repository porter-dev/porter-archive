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
	Hosts     []string          `yaml:"hosts" mapstructure:"hosts"`
}

type porterJob struct {
	Once bool
	Wait bool
}

type porterWebChartValues struct {
	Container struct {
		Port    string   `yaml:"port,omitempty" mapstructure:"port,omitempty"`
		Command string   `yaml:"command,omitempty" `
		Args    []string `yaml:"args,omitempty"`
		Env     struct {
			Normal map[string]string `yaml:"normal,omitempty"`
			Build  map[string]string `yaml:"build,omitempty"`
			Synced map[string]string `yaml:"synced,omitempty"`
		} `yaml:"env,omitempty"`
	} `yaml:"container,omitempty"`

	Resources struct {
		Requests struct {
			CPU    string `yaml:"cpu,omitempty"`
			Memory string `yaml:"memory,omitempty"`
		} `yaml:"requests,omitempty"`
	} `yaml:"resources,omitempty"`

	Ingress struct {
		Enabled      bool     `yaml:"enabled,omitempty"`
		CustomDomain bool     `yaml:"custom_domain,omitempty"`
		Hosts        []string `yaml:"hosts,omitempty"`
	} `yaml:"ingress,omitempty"`
}
