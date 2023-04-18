package stack

import (
	"fmt"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/switchboard/pkg/types"
	"gopkg.in/yaml.v2"
)

type StackConf struct {
	apiClient *api.Client
	rawBytes  []byte
	parsed    *PorterStackYAML
}

func CreateV1BuildResources(client *api.Client, raw []byte) (*types.ResourceGroup, error) {
	stackConf, err := createStackConf(client, raw)
	if err != nil {
		return nil, err
	}

	v1File := &types.ResourceGroup{
		Version: "v1",
		Resources: []*types.Resource{
			{
				Name:   "get-env",
				Driver: "os-env",
			},
		},
	}

	if stackConf.parsed.Build != nil {
		bi, err := stackConf.parsed.Build.getV1BuildImage(*stackConf.parsed.Env)
		if err != nil {
			return nil, err
		}

		pi, err := stackConf.parsed.Build.getV1PushImage()
		if err != nil {
			return nil, err
		}

		v1File.Resources = append(v1File.Resources, bi, pi)
	}

	return v1File, nil
}

func createStackConf(client *api.Client, raw []byte) (*StackConf, error) {
	parsed := &PorterStackYAML{}

	err := yaml.Unmarshal(raw, parsed)
	if err != nil {
		errMsg := composePreviewMessage("error parsing porter.yaml", Error)
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	err = validateCLIEnvironment()
	if err != nil {
		errMsg := composePreviewMessage("porter CLI is not configured correctly", Error)
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	return &StackConf{
		apiClient: client,
		rawBytes:  raw,
		parsed:    parsed,
	}, nil
}

func CreateV1ApplicationResources(client *api.Client, raw []byte) (*types.ResourceGroup, error) {
	stackConf, err := createStackConf(client, raw)
	if err != nil {
		return nil, err
	}

	v1File := &types.ResourceGroup{}

	for name, app := range *stackConf.parsed.Apps {
		if app == nil {
			continue
		}

		ai, err := app.getV1Resource(*name, stackConf.parsed.Build, stackConf.parsed.Env)
		if err != nil {
			return nil, err
		}

		v1File.Resources = append(v1File.Resources, ai)
	}

	return v1File, nil
}

func validateCLIEnvironment() error {
	if config.GetCLIConfig().Token == "" {
		return fmt.Errorf("no auth token present, please run 'porter auth login' to authenticate")
	}

	if config.GetCLIConfig().Project == 0 {
		return fmt.Errorf("no project selected, please run 'porter config set-project' to select a project")
	}

	if config.GetCLIConfig().Cluster == 0 {
		return fmt.Errorf("no cluster selected, please run 'porter config set-cluster' to select a cluster")
	}

	return nil
}
