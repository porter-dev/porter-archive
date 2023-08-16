package porter_app

import (
	"context"

	v2 "github.com/porter-dev/porter/internal/porter_app/v2"

	"sigs.k8s.io/yaml"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/telemetry"
)

// PorterYAMLVersion represents all the possible fields in a Porter YAML file
type PorterYAMLVersion struct {
	Version string `yaml:"version"`
}

func ParseYAML(ctx context.Context, porterYaml []byte) (*porterv1.PorterApp, error) {
	ctx, span := telemetry.NewSpan(ctx, "porter-app-parse-yaml")
	defer span.End()

	if porterYaml == nil {
		return nil, telemetry.Error(ctx, span, nil, "porter yaml is nil")
	}

	version := &PorterYAMLVersion{}
	err := yaml.Unmarshal(porterYaml, version)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error unmarshaling porter yaml")
	}
	if version == nil {
		return nil, telemetry.Error(ctx, span, nil, "porter yaml is nil")
	}

	var appProto *porterv1.PorterApp
	switch version.Version {
	case "v2":
		appProto, err = v2.AppProtoFromYaml(ctx, porterYaml)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error converting v2 yaml to proto")
		}
	default:
		return nil, telemetry.Error(ctx, span, nil, "porter yaml version not supported")
	}

	if appProto == nil {
		return nil, telemetry.Error(ctx, span, nil, "porter yaml is nil")
	}

	return appProto, nil
}
