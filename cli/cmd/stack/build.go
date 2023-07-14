package stack

import (
	"fmt"

	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/porter/internal/integrations/preview"
	"github.com/porter-dev/switchboard/pkg/types"
)

func (b *Build) GetName(appName string) string {
	if b == nil {
		return ""
	}

	return appName
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

func (b *Build) getV1BuildImage(appName string, env map[string]string, namespace string) (*types.Resource, error) {
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
	} else { // default to pack
		config.Build.Method = "pack"
		config.Build.Builder = b.GetBuilder()
		config.Build.Buildpacks = b.GetBuildpacks()
	}

	config.Build.Context = b.GetContext()
	config.Build.Env = CopyEnv(env)

	rawConfig := make(map[string]any)

	err := mapstructure.Decode(config, &rawConfig)
	if err != nil {
		return nil, err
	}

	return &types.Resource{
		Name:   fmt.Sprintf("%s-build-image", b.GetName(appName)),
		Driver: "build-image",
		Source: map[string]any{
			"name": "web",
		},
		Target: map[string]any{
			"app_name":  b.GetName(appName),
			"namespace": namespace,
		},
		DependsOn: []string{
			"get-env",
		},
		Config: rawConfig,
	}, nil
}

func GetBuildImageDriverName(appName string) string {
	return fmt.Sprintf("%s-build-image", appName)
}

func (b *Build) getV1PushImage(appName string, namespace string) (*types.Resource, error) {
	config := &preview.PushDriverConfig{}

	config.Push.Image = fmt.Sprintf("{ .%s.image }", GetBuildImageDriverName(appName))

	rawConfig := make(map[string]any)

	err := mapstructure.Decode(config, &rawConfig)
	if err != nil {
		return nil, err
	}

	return &types.Resource{
		Name:   fmt.Sprintf("%s-push-image", b.GetName(appName)),
		Driver: "push-image",
		DependsOn: []string{
			"get-env",
			GetBuildImageDriverName(appName),
		},
		Target: map[string]any{
			"app_name":  b.GetName(appName),
			"namespace": namespace,
		},
		Config: rawConfig,
	}, nil
}
