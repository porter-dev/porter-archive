package v2beta1

import (
	"fmt"
	"strings"

	"github.com/mitchellh/mapstructure"
	apiTypes "github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/integrations/preview"
	"github.com/porter-dev/switchboard/pkg/types"
)

func (a *AppResource) GetName() string {
	if a == nil || a.Name == nil {
		return ""
	}

	return *a.Name
}

func (a *AppResource) GetDependsOn() []string {
	var dependsOn []string

	if a == nil || a.DependsOn == nil {
		return dependsOn
	}

	for _, d := range a.DependsOn {
		if d == nil {
			continue
		}

		dependsOn = append(dependsOn, *d)
	}

	return dependsOn
}

func (a *AppResource) GetBuildRef() string {
	if a == nil || a.BuildRef == nil {
		return ""
	}

	return *a.BuildRef
}

func (a *AppResource) getV1Resource(b *Build) (*types.Resource, error) {
	config := &preview.ApplicationConfig{}

	config.Build.Method = "registry"
	config.Build.Image = fmt.Sprintf("\"{ .%s.image }\"", b.GetName())
	config.Build.Env = b.GetRawEnv()
	config.Values = a.HelmValues

	for _, eg := range b.GetEnvGroups() {
		ns, name, _ := strings.Cut(eg, "/")

		config.EnvGroups = append(config.EnvGroups, apiTypes.EnvGroupMeta{
			Name:      name,
			Namespace: ns,
		})
	}

	rawConfig := make(map[string]any)

	err := mapstructure.Decode(config, &rawConfig)

	if err != nil {
		return nil, err
	}

	return &types.Resource{
		Name:      a.GetName(),
		DependsOn: append([]string{b.GetName()}, a.GetDependsOn()...),
		Source: map[string]any{
			"name":    a.Chart.GetName(),
			"repo":    a.Chart.GetURL(),
			"version": a.Chart.GetVersion(),
		},
		Config: rawConfig,
	}, nil
}
