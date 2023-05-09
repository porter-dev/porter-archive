package stack

import (
	"context"
	"fmt"

	"github.com/mitchellh/mapstructure"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/porter/internal/integrations/preview"

	switchboardTypes "github.com/porter-dev/switchboard/pkg/types"
)

func createReleaseResource(client *api.Client, cmd *string, stackName, buildResourceName, pushResourceName string, projectID, clusterID uint, env map[string]string) (*switchboardTypes.Resource, error) {
	var finalCmd string
	releaseCmd := getReleaseCommandFromRelease(client, stackName, projectID, clusterID)
	if cmd == nil && releaseCmd == "" {
		return nil, nil
	} else if cmd != nil {
		finalCmd = *cmd
	} else {
		finalCmd = releaseCmd
	}

	config := &preview.ApplicationConfig{}

	config.Build.Method = "registry"
	config.Build.Image = fmt.Sprintf("{ .%s.image }", buildResourceName)
	config.Build.Env = CopyEnv(env)
	config.WaitForJob = true
	config.Values = map[string]interface{}{
		"container": map[string]interface{}{
			"command": finalCmd,
			"env":     CopyEnv(env),
		},
	}

	rawConfig := make(map[string]any)

	err := mapstructure.Decode(config, &rawConfig)
	if err != nil {
		return nil, fmt.Errorf("could not decode config for release: %w", err)
	}

	return &switchboardTypes.Resource{
		Name:      fmt.Sprintf("%s-r", stackName),
		DependsOn: []string{"get-env", buildResourceName, pushResourceName},
		Source: map[string]any{
			"name": "job",
		},
		Target: map[string]any{
			"app_name":  fmt.Sprintf("%s-r", stackName),
			"namespace": fmt.Sprintf("porter-stack-%s", stackName),
		},
		Config: rawConfig,
	}, nil
}

func getReleaseCommandFromRelease(client *api.Client, stackName string, projectID uint, clusterID uint) string {
	namespace := fmt.Sprintf("porter-stack-%s", stackName)
	releaseName := fmt.Sprintf("%s-r", stackName)
	release, err := client.GetRelease(
		context.Background(),
		projectID,
		clusterID,
		namespace,
		releaseName,
	)

	if err != nil || release == nil || release.Config == nil {
		return ""
	}

	containerMap, err := deploy.GetNestedMap(release.Config, "container")
	if err == nil {
		if command, ok := containerMap["command"]; ok {
			if commandString, ok := command.(string); ok {
				return commandString
			}
		}
	}

	return ""
}
