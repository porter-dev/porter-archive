package stack

import (
	"context"
	"fmt"
	"strings"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	switchboardTypes "github.com/porter-dev/switchboard/pkg/types"
	"gopkg.in/yaml.v2"
)

type StackConf struct {
	apiClient            *api.Client
	rawBytes             []byte
	parsed               *PorterStackYAML
	stackName, namespace string
	projectID, clusterID uint
}

func CreateV1BuildResources(client *api.Client, raw []byte, stackName string, projectID uint, clusterID uint) (*switchboardTypes.ResourceGroup, string, error) {
	v1File := &switchboardTypes.ResourceGroup{
		Version: "v1",
		Resources: []*switchboardTypes.Resource{
			{
				Name:   "get-env",
				Driver: "os-env",
			},
		},
	}
	var builder string

	stackConf, err := createStackConf(client, raw, stackName, projectID, clusterID)
	if err != nil {
		return nil, "", err
	}

	var bi, pi *switchboardTypes.Resource

	if stackConf.parsed.Build != nil {
		bi, pi, builder, err = createV1BuildResourcesFromPorterYaml(stackConf)
		if err != nil {
			color.New(color.FgRed).Printf("Could not build using values specified in porter.yaml (%s), attempting to load stack build settings instead \n", err.Error())
			bi, pi, builder, err = createV1BuildResourcesFromDB(client, stackConf)
			if err != nil {
				return nil, "", err
			}
		}
	} else {
		color.New(color.FgYellow).Printf("No build values specified in porter.yaml, attempting to load stack build settings instead \n")
		bi, pi, builder, err = createV1BuildResourcesFromDB(client, stackConf)
		if err != nil {
			return nil, "", err
		}
	}

	v1File.Resources = append(v1File.Resources, bi, pi)

	release, cmd, err := createReleaseResource(client,
		stackConf.parsed.Release,
		stackConf.stackName,
		bi.Name,
		pi.Name,
		stackConf.projectID,
		stackConf.clusterID,
		stackConf.parsed.Env,
	)
	if err != nil {
		return nil, "", err
	}

	if release != nil {
		color.New(color.FgYellow).Printf("Found release command to run before deploying apps: %s \n", cmd)
		v1File.Resources = append(v1File.Resources, release)
	} else {
		color.New(color.FgYellow).Printf("No release command found in porter.yaml or helm. \n")
	}

	return v1File, builder, nil
}

func createStackConf(client *api.Client, raw []byte, stackName string, projectID uint, clusterID uint) (*StackConf, error) {
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

	err := config.ValidateCLIEnvironment()
	if err != nil {
		errMsg := composePreviewMessage("porter CLI is not configured correctly", Error)
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	releaseEnvVars := getEnvFromRelease(client, stackName, projectID, clusterID)
	if releaseEnvVars != nil {
		color.New(color.FgYellow).Printf("Reading build env from release\n")
		parsed.Env = mergeStringMaps(parsed.Env, releaseEnvVars)
	}

	return &StackConf{
		apiClient: client,
		rawBytes:  raw,
		parsed:    parsed,
		stackName: stackName,
		projectID: projectID,
		clusterID: clusterID,
		namespace: fmt.Sprintf("porter-stack-%s", stackName),
	}, nil
}

func createV1BuildResourcesFromPorterYaml(stackConf *StackConf) (*switchboardTypes.Resource, *switchboardTypes.Resource, string, error) {
	bi, err := stackConf.parsed.Build.getV1BuildImage(stackConf.parsed.Env, stackConf.namespace)
	if err != nil {
		return nil, nil, "", err
	}

	pi, err := stackConf.parsed.Build.getV1PushImage(stackConf.namespace)
	if err != nil {
		return nil, nil, "", err
	}

	return bi, pi, stackConf.parsed.Build.GetBuilder(), nil
}

func createV1BuildResourcesFromDB(client *api.Client, stackConf *StackConf) (*switchboardTypes.Resource, *switchboardTypes.Resource, string, error) {
	res, err := client.GetPorterApp(context.Background(), stackConf.projectID, stackConf.clusterID, stackConf.stackName)
	if err != nil {
		return nil, nil, "", fmt.Errorf("unable to read build info from DB: %w", err)
	}

	if res == nil {
		return nil, nil, "", fmt.Errorf("stack %s not found", stackConf.stackName)
	}

	build := convertToBuild(res)

	bi, err := build.getV1BuildImage(stackConf.parsed.Env, stackConf.namespace)
	if err != nil {
		return nil, nil, "", err
	}

	pi, err := build.getV1PushImage(stackConf.namespace)
	if err != nil {
		return nil, nil, "", err
	}

	return bi, pi, build.GetBuilder(), nil
}

func convertToBuild(porterApp *types.PorterApp) Build {
	var context *string
	if porterApp.BuildContext != "" {
		context = &porterApp.BuildContext
	}

	var method *string
	var m string
	if porterApp.RepoName == "" {
		m = "registry"
		method = &m
	} else if porterApp.Dockerfile == "" {
		m = "pack"
		method = &m
	} else {
		m = "docker"
		method = &m
	}

	var builder *string
	if porterApp.Builder != "" {
		builder = &porterApp.Builder
	}

	var buildpacks []*string
	if porterApp.Buildpacks != "" {
		bpSlice := strings.Split(porterApp.Buildpacks, ",")
		buildpacks = make([]*string, len(bpSlice))
		for i, bp := range bpSlice {
			temp := bp
			buildpacks[i] = &temp
		}
	}

	var dockerfile *string
	if porterApp.Dockerfile != "" {
		dockerfile = &porterApp.Dockerfile
	}

	var image *string
	if porterApp.ImageRepoURI != "" {
		image = &porterApp.ImageRepoURI
	}

	return Build{
		Context:    context,
		Method:     method,
		Builder:    builder,
		Buildpacks: buildpacks,
		Dockerfile: dockerfile,
		Image:      image,
	}
}

func createDefaultPorterYaml() *PorterStackYAML {
	return &PorterStackYAML{
		Apps: nil,
	}
}

func getEnvFromRelease(client *api.Client, stackName string, projectID uint, clusterID uint) map[string]string {
	var envVarsStringMap map[string]string
	namespace := fmt.Sprintf("porter-stack-%s", stackName)
	release, err := client.GetRelease(
		context.Background(),
		projectID,
		clusterID,
		namespace,
		stackName,
	)

	if err == nil && release != nil {
		for key, val := range release.Config {
			if key != "global" && isMapStringInterface(val) {
				appConfig := val.(map[string]interface{})
				if appConfig != nil {
					if container, ok := appConfig["container"]; ok {
						if containerMap, ok := container.(map[string]interface{}); ok {
							if env, ok := containerMap["env"]; ok {
								if envMap, ok := env.(map[string]interface{}); ok {
									if normal, ok := envMap["normal"]; ok {
										if normalMap, ok := normal.(map[string]interface{}); ok {
											convertedMap, err := toStringMap(normalMap)
											if err == nil && len(convertedMap) > 0 {
												envVarsStringMap = convertedMap
												break
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	return envVarsStringMap
}

func isMapStringInterface(val interface{}) bool {
	_, ok := val.(map[string]interface{})
	return ok
}

func toStringMap(m map[string]interface{}) (map[string]string, error) {
	result := make(map[string]string)
	for k, v := range m {
		strVal, ok := v.(string)
		if !ok {
			return nil, fmt.Errorf("value for key %q is not a string", k)
		}
		result[k] = strVal
	}
	return result, nil
}

func mergeStringMaps(base, override map[string]string) map[string]string {
	result := make(map[string]string)

	if base == nil && override == nil {
		return result
	}

	for k, v := range base {
		result[k] = v
	}

	for k, v := range override {
		result[k] = v
	}

	return result
}
