package parser

import (
	"github.com/porter-dev/porter/cli/cmd/switchboard/types"
	"sigs.k8s.io/yaml"
)

func ParseRawBytes(raw []byte) (*types.ResourceGroup, error) {
	res := &types.ResourceGroup{}

	err := yaml.Unmarshal(raw, res)

	if err != nil {
		return nil, err
	}

	return res, nil
}
