package porter_app

import (
	"context"

	v1 "github.com/porter-dev/porter/internal/porter_app/v1"
	v2 "github.com/porter-dev/porter/internal/porter_app/v2"

	"sigs.k8s.io/yaml"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
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
func ParseYAML(ctx context.Context, porterYaml []byte, appName string) (*porterv1.PorterApp, error) {
	ctx, span := telemetry.NewSpan(ctx, "porter-app-parse-yaml")
	defer span.End()

	if porterYaml == nil {
		return nil, telemetry.Error(ctx, span, nil, "porter yaml input is nil")
	}

	version := &yamlVersion{}
	err := yaml.Unmarshal(porterYaml, version)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error unmarshaling porter yaml")
	}

	var appProto *porterv1.PorterApp

	switch version.Version {
	case PorterYamlVersion_V2:
		appProto, err = v2.AppProtoFromYaml(ctx, porterYaml, appName)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error converting v2 yaml to proto")
		}
	// backwards compatibility for old porter.yaml files
	// track this span in telemetry and reach out to customers who are still using old porter.yaml if they exist.
	// once no one is converting from old porter.yaml, we can remove this code
	case PorterYamlVersion_V1, "":
		if appName == "" {
			return nil, telemetry.Error(ctx, span, nil, "v1 porter yaml requires externally-provided app name")
		}
		appProto, err = v1.AppProtoFromYaml(ctx, porterYaml, appName)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error converting v1 yaml to proto")
		}
	default:
		return nil, telemetry.Error(ctx, span, nil, "porter yaml version not supported")
	}

	if appProto == nil {
		return nil, telemetry.Error(ctx, span, nil, "porter yaml output is nil")
	}

	return appProto, nil
}

// yamlVersion is a struct used to unmarshal the version field of a Porter YAML file
type yamlVersion struct {
	Version PorterYamlVersion `yaml:"version"`
}
