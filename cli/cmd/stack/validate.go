package stack

import (
	"fmt"

	"gopkg.in/yaml.v2"
)

func createDefaultPorterYaml() *PorterStackYAML {
	return &PorterStackYAML{
		Apps: nil,
	}
}

func ValidateAndMarshal(raw []byte) (*PorterStackYAML, error) {
	var parsed *PorterStackYAML

	if raw == nil {
		parsed = createDefaultPorterYaml()
	} else {
		parsed = &PorterStackYAML{}
		err := yaml.Unmarshal(raw, parsed)
		if err != nil {
			errMsg := composePreviewMessage("error parsing porter.yaml", Error)
			return nil, fmt.Errorf("%s: %w", errMsg, err)
		}
	}

	return parsed, nil
}

func CreateAppFromFile(base *PorterStackYAML) (*Application, error) {
	if base.Applications != nil {
		errMsg := composePreviewMessage("error parsing porter.yaml", Error)
		err := fmt.Errorf("expected one porter app, found many")
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	if base.Apps != nil && base.Services != nil {
		errMsg := composePreviewMessage("error parsing porter.yaml", Error)
		err := fmt.Errorf("'apps' and 'services' are synonymous but both were defined")
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	var services map[string]*Service

	if base.Apps != nil {
		services = base.Apps
	} else {
		services = base.Services
	}

	return &Application{
		Env:      base.Env,
		Services: services,
		Build:    base.Build,
		Release:  base.Release,
	}, nil
}
