package deploy

import (
	"context"
	"fmt"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
)

// SharedOpts are common options for build, create, and deploy agents
type SharedOpts struct {
	ProjectID       uint
	ClusterID       uint
	Namespace       string
	LocalPath       string
	LocalDockerfile string
	OverrideTag     string
	Method          DeployBuildType
	AdditionalEnv   map[string]string
	EnvGroups       []types.EnvGroupMeta
}

func coalesceEnvGroups(
	client *api.Client,
	projectID, clusterID uint,
	namespace string,
	envGroups []types.EnvGroupMeta,
	config map[string]interface{},
) error {
	for _, group := range envGroups {
		if group.Name == "" {
			return fmt.Errorf("env group name cannot be empty")
		}

		envGroup, err := client.GetEnvGroup(
			context.Background(),
			projectID,
			clusterID,
			namespace,
			&types.GetEnvGroupRequest{
				Name:    group.Name,
				Version: group.Version,
			},
		)

		if err != nil && err.Error() == "env group not found" {
			if group.Namespace == "" {
				return fmt.Errorf("env group namespace cannot be empty")
			}

			color.New(color.FgBlue, color.Bold).
				Printf("Env group '%s' does not exist in the target namespace '%s'\n", group.Name, namespace)
			color.New(color.FgBlue, color.Bold).
				Printf("Cloning env group '%s' from namespace '%s' to target namespace '%s'\n",
					group.Name, group.Namespace, namespace)

			envGroup, err = client.CloneEnvGroup(
				context.Background(), projectID, clusterID, group.Namespace,
				&types.CloneEnvGroupRequest{
					Name:      group.Name,
					Namespace: namespace,
				},
			)

			if err != nil {
				return err
			}
		} else if err != nil {
			return err
		}

		envConfig, err := getNestedMap(config, "container", "env", "normal")

		if err != nil || envConfig == nil {
			envConfig = make(map[string]interface{})
		}

		for k, v := range envGroup.Variables {
			envConfig[k] = v
		}

		containerMap, _ := config["container"].(map[string]interface{})
		envMap, _ := containerMap["env"].(map[string]interface{})

		envMap["normal"] = envConfig
	}

	return nil
}
