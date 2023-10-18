package porter_app

import (
	"context"

	v1 "github.com/porter-dev/porter/internal/porter_app/v1"
	v2 "github.com/porter-dev/porter/internal/porter_app/v2"

	"sigs.k8s.io/yaml"

	"github.com/porter-dev/porter/internal/telemetry"
)

// PorterYamlVersion is a string type for the version of the porter yaml
type PorterYamlVersion string

const (
	// PorterYamlVersion_V2 is the v2 version of the porter yaml
	PorterYamlVersion_V2 PorterYamlVersion = "v2"
	// PorterYamlVersion_V1 is the v1, legacy version of the porter yaml
	PorterYamlVersion_V1 PorterYamlVersion = "v1stack"
)

// ParseYAML converts a Porter YAML file into a PorterApp proto object
func ParseYAML(ctx context.Context, porterYaml []byte, appName string) ([]v2.AppWithPreviewOverrides, error) {
	ctx, span := telemetry.NewSpan(ctx, "porter-app-parse-yaml")
	defer span.End()

	var appDefinitions []v2.AppWithPreviewOverrides

	if porterYaml == nil {
		return appDefinitions, telemetry.Error(ctx, span, nil, "porter yaml input is nil")
	}

	version := &YamlVersion{}
	err := yaml.Unmarshal(porterYaml, version)
	if err != nil {
		return appDefinitions, telemetry.Error(ctx, span, err, "error unmarshaling porter yaml")
	}

	switch version.Version {
	case PorterYamlVersion_V2:
		appDefinitions, err = v2.AppProtoFromYaml(ctx, porterYaml, appName)
		if err != nil {
			return appDefinitions, telemetry.Error(ctx, span, err, "error converting v2 yaml to proto")
		}
	// backwards compatibility for old porter.yaml files
	// track this span in telemetry and reach out to customers who are still using old porter.yaml if they exist.
	// once no one is converting from old porter.yaml, we can remove this code
	case PorterYamlVersion_V1, "":
		appProto, envVariables, err := v1.AppProtoFromYaml(ctx, porterYaml, appName)
		if err != nil {
			return appDefinitions, telemetry.Error(ctx, span, err, "error converting v1 yaml to proto")
		}

		appDefinition := v2.AppWithPreviewOverrides{
			AppProtoWithEnv: v2.AppProtoWithEnv{
				AppProto:     appProto,
				EnvVariables: envVariables,
			},
		}

		appDefinitions = append(appDefinitions, appDefinition)
	default:
		return appDefinitions, telemetry.Error(ctx, span, nil, "porter yaml version not supported")
	}

	if appDefinitions == nil {
		return appDefinitions, telemetry.Error(ctx, span, nil, "porter yaml output is nil")
	}

	var found bool
	for _, appDefinition := range appDefinitions {
		if appDefinition.AppProto.Name == "" {
			return appDefinitions, telemetry.Error(ctx, span, nil, "all apps must have a name")
		}
		if appDefinition.AppProto.Name == appName {
			found = true
		}
	}

	if appName != "" {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "override-name", Value: appName})
		if !found {
			return appDefinitions, telemetry.Error(ctx, span, nil, "no app names specified in porter.yaml match provided app name")
		}
	}

	return appDefinitions, nil
}

// yamlVersion is a struct used to unmarshal the version field of a Porter YAML file
type YamlVersion struct {
	Version PorterYamlVersion `yaml:"version"`
}
