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
