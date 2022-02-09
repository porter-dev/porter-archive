package deploy

import (
	"context"
	"strconv"
	"strings"

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
	EnvGroups       []string
}

func getEnvGroupNameVersion(group string) (string, uint, error) {
	if !strings.Contains(group, "@") {
		return group, 0, nil
	}

	envGroupSpl := strings.Split(group, "@")
	envGroupName := envGroupSpl[0]
	envGroupVersion := uint64(0)

	envGroupVersion, err := strconv.ParseUint(envGroupSpl[1], 10, 32)

	if err != nil {
		return "", 0, err
	}

	return envGroupName, uint(envGroupVersion), nil
}

func coalesceEnvGroups(
	client *api.Client,
	projectID, clusterID uint,
	namespace string,
	envGroups []string,
	config map[string]interface{},
) error {
	for _, group := range envGroups {
		if group == "" {
			continue
		}

		envGroupName, envGroupVersion, err := getEnvGroupNameVersion(group)

		if err != nil {
			return err
		}

		envGroup, err := client.GetEnvGroup(
			context.Background(),
			projectID,
			clusterID,
			namespace,
			&types.GetEnvGroupRequest{
				Name:    envGroupName,
				Version: envGroupVersion,
			},
		)

		if err != nil {
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
