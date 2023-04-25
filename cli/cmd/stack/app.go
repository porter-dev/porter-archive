package stack

import (
	"fmt"

	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/porter/internal/integrations/preview"
	"github.com/porter-dev/porter/internal/templater/utils"
	"github.com/porter-dev/switchboard/pkg/types"
)

func (a *App) GetType() string {
	return *a.Type
}

func (a *App) GetDefaultValues() map[string]interface{} {
	var defaultValues map[string]interface{}
	if *a.Type == "web" {
		defaultValues = map[string]interface{}{
			"ingress": map[string]interface{}{
				"enabled": false,
			},
			"container": map[string]interface{}{
				"command": *a.Run,
				"env":     map[string]interface{}{},
			},
		}
	} else {
		defaultValues = map[string]interface{}{
			"container": map[string]interface{}{
				"command": *a.Run,
				"env":     map[string]interface{}{},
			},
		}
	}
	return defaultValues
}

func (a *App) getV1Resource(name string, b *Build, env map[string]string) (*types.Resource, error) {
	config := &preview.ApplicationConfig{}

	if a.Config == nil {
		a.Config = make(map[string]interface{})
	}
	config.Build.Method = "registry"
	config.Build.Image = fmt.Sprintf("{ .%s.image }", b.GetName())
	config.Build.Env = CopyEnv(env)

	defaultValues := a.GetDefaultValues()
	containerDefaultValues, err := deploy.GetNestedMap(defaultValues, "container", "env")
	if err != nil {
		return nil, err
	}
	containerDefaultValues["normal"] = CopyEnv(env)
	config.Values = utils.CoalesceValues(defaultValues, a.Config)

	rawConfig := make(map[string]any)

	err = mapstructure.Decode(config, &rawConfig)
	if err != nil {
		return nil, err
	}

	return &types.Resource{
		Name:      name,
		DependsOn: []string{"get-env", b.GetName()},
		Source: map[string]any{
			"name": a.GetType(),
		},
		Config: rawConfig,
		Driver: "",
	}, nil
}
