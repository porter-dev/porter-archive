package preview

import "github.com/porter-dev/porter/api/types"

type Source struct {
	Name          string
	Repo          string
	Version       string
	IsApplication bool
	SourceValues  map[string]interface{}
}

type Target struct {
	AppName   string `mapstructure:"app_name"`
	Project   uint
	Cluster   uint
	Namespace string
}

type RandomStringDriverConfig struct {
	Length uint
	Lower  bool
}

type EnvGroupDriverConfig struct {
	EnvGroups []*types.EnvGroup `mapstructure:"env_groups"`
}

type UpdateConfigDriverConfig struct {
	WaitForJob bool

	// If set to true, this does not run an update, it only creates the initial application and job,
	// skipping subsequent updates
	OnlyCreate bool

	UpdateConfig struct {
		Image string
		Tag   string
	} `mapstructure:"update_config"`

	EnvGroups []types.EnvGroupMeta `mapstructure:"env_groups"`

	Values map[string]interface{}
}

type PushDriverConfig struct {
	Push struct {
		UsePackCache bool `mapstructure:"use_pack_cache"`
		Image        string
	}
}

type BuildDriverConfig struct {
	Build struct {
		UsePackCache bool `mapstructure:"use_pack_cache"`
		Method       string
		Context      string
		Dockerfile   string
		Builder      string
		Buildpacks   []string
		Image        string
		Env          map[string]string
	}

	EnvGroups []types.EnvGroupMeta `mapstructure:"env_groups"`

	Values map[string]interface{}
}

type ApplicationConfig struct {
	WaitForJob bool

	// If set to true, this does not run an update, it only creates the initial application and job,
	// skipping subsequent updates
	OnlyCreate bool

	Build struct {
		UseCache   bool `mapstructure:"use_cache"`
		Method     string
		Context    string
		Dockerfile string
		Image      string
		Builder    string
		Buildpacks []string
		Env        map[string]string
	}

	EnvGroups []types.EnvGroupMeta `mapstructure:"env_groups"`

	Values map[string]interface{}
}
