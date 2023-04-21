package stack

import (
	"fmt"

	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/porter/internal/integrations/preview"
	"github.com/porter-dev/switchboard/pkg/types"
)

func (a *App) populateDefaults(env *map[*string]*string) error {
	if a.Config == nil {
		a.Config = make(map[string]interface{})
	}
	var defaultValues map[string]interface{}
	if *a.Type == "web" {
		defaultValues = map[string]interface{}{
			"ingress": map[string]interface{}{
				"enabled": false,
			},
			"container": map[string]interface{}{
				"command": *a.Run,
				"env": map[string]interface{}{
					"normal": GetEnv(*env),
				},
			},
		}
	} else {
		defaultValues = map[string]interface{}{
			"container": map[string]interface{}{
				"command": *a.Run,
				"env": map[string]interface{}{
					"normal": GetEnv(*env),
				},
			},
		}
	}
	mergedValues := CoalesceValues(defaultValues, a.Config)
	a.Config = mergedValues
	return nil
}

func (a *App) getV1Resource(name string, b *Build, env *map[*string]*string) (*types.Resource, error) {
	a.populateDefaults(env)

	config := &preview.ApplicationConfig{}

	config.Build.Method = "registry"
	config.Build.Image = fmt.Sprintf("{ .%s.image }", b.GetName())
	config.Build.Env = GetEnv(*env)
	config.Values = a.Config

	rawConfig := make(map[string]any)

	err := mapstructure.Decode(config, &rawConfig)
	if err != nil {
		return nil, err
	}

	return &types.Resource{
		Name:      name,
		DependsOn: []string{"get-env", b.GetName()},
		Source: map[string]any{
			"name": *a.Type,
		},
		Config: rawConfig,
		Driver: "",
	}, nil
}
