package v2beta1

import (
	"fmt"
	"strings"

	"github.com/mitchellh/mapstructure"
	apiTypes "github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/integrations/preview"
	"github.com/porter-dev/switchboard/pkg/types"
)

func (b *Build) GetName() string {
	if b == nil || b.Name == nil {
		return ""
	}

	return *b.Name
}

func (b *Build) GetContext() string {
	if b == nil || b.Context == nil || *b.Context == "" {
		return "."
	}

	return *b.Context
}

func (b *Build) GetMethod() string {
	if b == nil || b.Method == nil {
		return ""
	}

	return *b.Method
}

func (b *Build) GetBuilder() string {
	if b == nil || b.Builder == nil {
		return ""
	}

	return *b.Builder
}

func (b *Build) GetBuildpacks() []string {
	if b == nil || b.Buildpacks == nil {
		return []string{}
	}

	var bp []string

	for _, b := range b.Buildpacks {
		if b == nil {
			continue
		}

		bp = append(bp, *b)
	}

	return bp
}

func (b *Build) GetDockerfile() string {
	if b == nil || b.Dockerfile == nil {
		return ""
	}

	return *b.Dockerfile
}

func (b *Build) GetImage() string {
	if b == nil || b.Image == nil {
		return ""
	}

	return *b.Image
}

func (b *Build) GetRawEnv() map[string]string {
	env := make(map[string]string)

	if b == nil || b.Env == nil {
		return env
	}

	for k, v := range b.Env.Raw {
		if k == nil || v == nil {
			continue
		}

		env[*k] = *v
	}

	return env
}

func (b *Build) GetEnvGroups() []string {
	var eg []string

	if b == nil || b.Env == nil {
		return eg
	}

	for _, g := range b.Env.ImportFrom {
		if g == nil {
			continue
		}

		ns, name, valid := strings.Cut(*g, "/")

		if !valid || ns == "" || name == "" {
			printWarningMessage(fmt.Sprintf("ignoring invalid env group name: %s", *g))
			continue
		}

		eg = append(eg, *g)
	}

	return eg
}

func (b *Build) getV1BuildImage() (*types.Resource, error) {
	config := &preview.BuildDriverConfig{}

	if b.GetMethod() == "pack" {
		config.Build.Method = "pack"
		config.Build.Builder = b.GetBuilder()
		config.Build.Buildpacks = b.GetBuildpacks()
	} else if b.GetMethod() == "docker" {
		config.Build.Method = "docker"
		config.Build.Dockerfile = b.GetDockerfile()
	} else if b.GetMethod() == "registry" {
		config.Build.Method = "registry"
		config.Build.Image = b.GetImage()
	} else {
		return nil, fmt.Errorf("invalid build method: %s", b.GetMethod())
	}

	config.Build.Context = b.GetContext()
	config.Build.Env = b.GetRawEnv()

	for _, eg := range b.GetEnvGroups() {
		ns, name, _ := strings.Cut(eg, "/")

		config.EnvGroups = append(config.EnvGroups, apiTypes.EnvGroupMeta{
			Namespace: ns,
			Name:      name,
		})
	}

	rawConfig := make(map[string]any)

	err := mapstructure.Decode(config, &rawConfig)
	if err != nil {
		return nil, err
	}

	return &types.Resource{
		Name:   fmt.Sprintf("%s-build-image", b.GetName()),
		Driver: "build-image",
		Source: map[string]any{
			"name": "web",
		},
		Target: map[string]any{
			"app_name": b.GetName(),
		},
		Config: rawConfig,
	}, nil
}

func (b *Build) getV1PushImage() (*types.Resource, error) {
	config := &preview.PushDriverConfig{}

	config.Push.Image = fmt.Sprintf("{ .%s-build-image.image }", b.GetName())

	rawConfig := make(map[string]any)

	err := mapstructure.Decode(config, &rawConfig)
	if err != nil {
		return nil, err
	}

	return &types.Resource{
		Name:   b.GetName(),
		Driver: "push-image",
		DependsOn: []string{
			fmt.Sprintf("%s-build-image", b.GetName()),
		},
		Target: map[string]any{
			"app_name": b.GetName(),
		},
		Config: rawConfig,
	}, nil
}
