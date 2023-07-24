package stack

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	switchboardTypes "github.com/porter-dev/switchboard/pkg/types"
	switchboardWorker "github.com/porter-dev/switchboard/pkg/worker"
	"gopkg.in/yaml.v3"
)

type StackConf struct {
	apiClient            *api.Client
	parsed               *Application
	stackName, namespace string
	projectID, clusterID uint
}

func CreateApplicationDeploy(client *api.Client, worker *switchboardWorker.Worker, app *Application, applicationName string, cliConf *config.CLIConfig) ([]*switchboardTypes.Resource, error) {
	// we need to know the builder so that we can inject launcher to the start command later if heroku builder is used
	var builder string

	namespace, envMeta, err := HandleEnvironmentConfiguration(client, cliConf, applicationName)
	if err != nil {
		return nil, err
	}

	stackConf, err := createStackConf(client, app, namespace, applicationName, cliConf.Project, cliConf.Cluster)
	if err != nil {
		return nil, fmt.Errorf("error parsing porter.yaml: %w", err)
	}

	resources, builder, err := createV1BuildResources(client, app, stackConf, envMeta)
	if err != nil {
		return nil, err
	}

	applicationBytes, err := yaml.Marshal(app)
	if err != nil {
		return nil, fmt.Errorf("malformed application definition: %w", err)
	}

	deployAppHook := &DeployAppHook{
		Client:               client,
		ApplicationName:      applicationName,
		ProjectID:            cliConf.Project,
		ClusterID:            cliConf.Cluster,
		BuildImageDriverName: GetBuildImageDriverName(applicationName),
		PorterYAML:           applicationBytes,
		Builder:              builder,
		Namespace:            namespace,
		EnvironmentMeta:      envMeta,
	}

	worker.RegisterHook("deploy-app", deployAppHook)
	return resources, nil
}

// Create app event to signfy start of build
func createAppEvent(client *api.Client, applicationName string, projectId, clusterId uint) (string, error) {
	var req *types.CreateOrUpdatePorterAppEventRequest
	if os.Getenv("GITHUB_RUN_ID") != "" {
		req = &types.CreateOrUpdatePorterAppEventRequest{
			Status:             "PROGRESSING",
			Type:               types.PorterAppEventType_Build,
			TypeExternalSource: "GITHUB",
			Metadata: map[string]any{
				"action_run_id": os.Getenv("GITHUB_RUN_ID"),
				"org":           os.Getenv("GITHUB_REPOSITORY_OWNER"),
			},
		}

		repoNameSplit := strings.Split(os.Getenv("GITHUB_REPOSITORY"), "/")
		if len(repoNameSplit) != 2 {
			return "", fmt.Errorf("unable to parse GITHUB_REPOSITORY")
		}
		req.Metadata["repo"] = repoNameSplit[1]

		actionRunID := os.Getenv("GITHUB_RUN_ID")
		if actionRunID != "" {
			arid, err := strconv.Atoi(actionRunID)
			if err != nil {
				return "", fmt.Errorf("unable to parse GITHUB_RUN_ID as int: %w", err)
			}
			req.Metadata["action_run_id"] = arid
		}

		repoOwnerAccountID := os.Getenv("GITHUB_REPOSITORY_OWNER_ID")
		if repoOwnerAccountID != "" {
			arid, err := strconv.Atoi(repoOwnerAccountID)
			if err != nil {
				return "", fmt.Errorf("unable to parse GITHUB_REPOSITORY_OWNER_ID as int: %w", err)
			}
			req.Metadata["github_account_id"] = arid
		}
	} else {
		req = &types.CreateOrUpdatePorterAppEventRequest{
			Status:             "PROGRESSING",
			Type:               types.PorterAppEventType_Build,
			TypeExternalSource: "GITHUB",
			Metadata:           map[string]any{},
		}
	}

	ctx := context.Background()
	event, err := client.CreateOrUpdatePorterAppEvent(ctx, projectId, clusterId, applicationName, req)
	if err != nil {
		return "", fmt.Errorf("unable to create porter app build event: %w", err)
	}

	return event.ID, nil
}

func createV1BuildResources(client *api.Client, app *Application, stackConf *StackConf, envMeta EnvironmentMeta) ([]*switchboardTypes.Resource, string, error) {
	resources := make([]*switchboardTypes.Resource, 0)

	// look up build settings from DB if none specified in porter.yaml
	if stackConf.parsed.Build == nil {
		color.New(color.FgYellow).Printf("No build values specified in porter.yaml, attempting to load stack build settings instead \n")

		var converted Build
		if envMeta.EnvironmentConfigID == 0 {
			res, err := client.GetPorterApp(context.Background(), stackConf.projectID, stackConf.clusterID, stackConf.stackName)
			if err != nil {
				return nil, "", fmt.Errorf("unable to read build info from DB: %w", err)
			}
			converted = convertToBuild(res)
		} else {
			color.New(color.FgYellow).Printf("Looking for application %s in specified environment \n", stackConf.stackName)

			res, err := client.GetPorterAppByEnvironment(context.Background(), stackConf.projectID, stackConf.clusterID, envMeta.EnvironmentConfigID, stackConf.stackName)
			if err != nil {
				return nil, "", fmt.Errorf("unable to read build info from DB: %w", err)
			}
			converted = convertToBuild(res)
		}

		stackConf.parsed.Build = &converted
	}

	// only include build and push steps if an image is not already specified
	if stackConf.parsed.Build.Image == nil {
		bi, pi, builder, err := createV1BuildResourcesFromPorterYaml(stackConf)

		if err != nil {
			return nil, "", err
		}

		resources = append(resources, bi, pi)

		// also excluding use of pre-deploy with pre-built imges
		preDeploy, cmd, err := createPreDeployResource(client,
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

		if preDeploy != nil {
			color.New(color.FgYellow).Printf("Found pre-deploy command to run before deploying apps: %s \n", cmd)
			resources = append(resources, preDeploy)
		} else {
			color.New(color.FgYellow).Printf("No pre-deploy command found in porter.yaml or helm. \n")
		}

		return resources, builder, nil
	}

	return resources, "", nil
}

func createStackConf(client *api.Client, app *Application, namespace string, stackName string, projectID uint, clusterID uint) (*StackConf, error) {
	err := config.ValidateCLIEnvironment()
	if err != nil {
		errMsg := composePreviewMessage("porter CLI is not configured correctly", Error)
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	releaseEnvVars := getEnvFromRelease(client, stackName, projectID, clusterID)
	if releaseEnvVars != nil {
		color.New(color.FgYellow).Printf("Reading build env from release\n")
		app.Env = mergeStringMaps(app.Env, releaseEnvVars)
	}

	return &StackConf{
		apiClient: client,
		parsed:    app,
		stackName: stackName,
		projectID: projectID,
		clusterID: clusterID,
		namespace: namespace,
	}, nil
}

func createV1BuildResourcesFromPorterYaml(stackConf *StackConf) (*switchboardTypes.Resource, *switchboardTypes.Resource, string, error) {
	bi, err := stackConf.parsed.Build.getV1BuildImage(stackConf.stackName, stackConf.parsed.Env, stackConf.namespace)
	if err != nil {
		return nil, nil, "", err
	}

	pi, err := stackConf.parsed.Build.getV1PushImage(stackConf.stackName, stackConf.namespace)
	if err != nil {
		return nil, nil, "", err
	}

	return bi, pi, stackConf.parsed.Build.GetBuilder(), nil
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
