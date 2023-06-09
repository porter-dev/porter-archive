package stack

import (
	"context"
	"fmt"
	"strings"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/internal/telemetry"
	switchboardTypes "github.com/porter-dev/switchboard/pkg/types"
	"go.opentelemetry.io/otel/trace"
	"gopkg.in/yaml.v2"
)

type StackConf struct {
	apiClient            *api.Client
	rawBytes             []byte
	parsed               *PorterStackYAML
	stackName, namespace string
	projectID, clusterID uint
}

func CreateV1BuildResources(ctx context.Context, client *api.Client, raw []byte, stackName string, projectID uint, clusterID uint) (*switchboardTypes.ResourceGroup, string, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-v1-build-resources")
	defer span.End()

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

	stackConf, err := createStackConf(ctx, span, client, raw, stackName, projectID, clusterID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating stack config")
		return nil, "", err
	}

	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "application-name", Value: stackConf.stackName},
		telemetry.AttributeKV{Key: "project-id", Value: stackConf.projectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: stackConf.clusterID},
	)

	var bi, pi *switchboardTypes.Resource

	if stackConf.parsed.Build != nil {
		bi, pi, builder, err = createV1BuildResourcesFromPorterYaml(ctx, stackConf)
		if err != nil {
			color.New(color.FgRed).Printf("Could not build using values specified in porter.yaml (%s), attempting to load stack build settings instead \n", err.Error())
			bi, pi, builder, err = createV1BuildResourcesFromDB(ctx, client, stackConf)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error creating build resources")
				return nil, "", err
			}
		}
	} else {
		color.New(color.FgYellow).Printf("No build values specified in porter.yaml, attempting to load stack build settings instead \n")
		bi, pi, builder, err = createV1BuildResourcesFromDB(ctx, client, stackConf)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating build resources")
			return nil, "", err
		}
	}

	v1File.Resources = append(v1File.Resources, bi, pi)

	preDeploy, cmd, err := maybeCreatePreDeployResource(
		ctx,
		client,
		stackConf.parsed.Release,
		stackConf.stackName,
		bi.Name,
		pi.Name,
		stackConf.projectID,
		stackConf.clusterID,
		stackConf.parsed.Env,
	)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating pre-deploy resource")
		return nil, "", err
	}

	if preDeploy != nil {
		telemetry.WithAttributes(
			span,
			telemetry.AttributeKV{Key: "pre-deploy-resource-name", Value: preDeploy.Name},
			telemetry.AttributeKV{Key: "pre-deploy-resource-driver", Value: preDeploy.Driver},
			telemetry.AttributeKV{Key: "pre-deploy-resource-source", Value: preDeploy.Source},
			telemetry.AttributeKV{Key: "pre-deploy-resource-target", Value: preDeploy.Target},
		)
		color.New(color.FgYellow).Printf("Found pre-deploy command to run before deploying apps: %s \n", cmd)
		v1File.Resources = append(v1File.Resources, preDeploy)
	} else {
		color.New(color.FgYellow).Printf("No pre-deploy command found in porter.yaml or helm. \n")
	}

	return v1File, builder, nil
}

func createStackConf(ctx context.Context, span trace.Span, client *api.Client, raw []byte, stackName string, projectID uint, clusterID uint) (*StackConf, error) {
	var parsed *PorterStackYAML
	if raw == nil {
		parsed = createDefaultPorterYaml()
	} else {
		parsed = &PorterStackYAML{}
		err := yaml.Unmarshal(raw, parsed)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error parsing porter.yaml")
			errMsg := composePreviewMessage("error parsing porter.yaml", Error)
			return nil, fmt.Errorf("%s: %w", errMsg, err)
		}
	}

	err := config.ValidateCLIEnvironment()
	if err != nil {
		err = telemetry.Error(ctx, span, err, "porter CLI is not configured correctly")
		errMsg := composePreviewMessage("porter CLI is not configured correctly", Error)
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	releaseEnvVars := getEnvFromRelease(ctx, client, stackName, projectID, clusterID)
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

func createV1BuildResourcesFromPorterYaml(ctx context.Context, stackConf *StackConf) (*switchboardTypes.Resource, *switchboardTypes.Resource, string, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-v1-build-resources-from-porter-yaml")
	bi, err := stackConf.parsed.Build.getV1BuildImage(stackConf.parsed.Env, stackConf.namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating build resource")
		return nil, nil, "", err
	}
	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "build-resource-name", Value: bi.Name},
		telemetry.AttributeKV{Key: "build-resource-driver", Value: bi.Driver},
		telemetry.AttributeKV{Key: "build-resource-source", Value: bi.Source},
		telemetry.AttributeKV{Key: "build-resource-target", Value: bi.Target},
	)

	pi, err := stackConf.parsed.Build.getV1PushImage(stackConf.namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating push resource")
		return nil, nil, "", err
	}
	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "push-resource-name", Value: bi.Name},
		telemetry.AttributeKV{Key: "push-resource-driver", Value: bi.Driver},
		telemetry.AttributeKV{Key: "push-resource-source", Value: bi.Source},
		telemetry.AttributeKV{Key: "push-resource-target", Value: bi.Target},
	)

	return bi, pi, stackConf.parsed.Build.GetBuilder(), nil
}

func createV1BuildResourcesFromDB(ctx context.Context, client *api.Client, stackConf *StackConf) (*switchboardTypes.Resource, *switchboardTypes.Resource, string, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-v1-build-resources-from-db")

	res, err := client.GetPorterApp(context.Background(), stackConf.projectID, stackConf.clusterID, stackConf.stackName)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error reading build info from DB")
		return nil, nil, "", err
	}

	if res == nil {
		err = telemetry.Error(ctx, span, err, "stack not found")
		return nil, nil, "", err
	}

	build := convertToBuild(res)

	bi, err := build.getV1BuildImage(stackConf.parsed.Env, stackConf.namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating build resource")
		return nil, nil, "", err
	}
	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "build-resource-name", Value: bi.Name},
		telemetry.AttributeKV{Key: "build-resource-driver", Value: bi.Driver},
		telemetry.AttributeKV{Key: "build-resource-source", Value: bi.Source},
		telemetry.AttributeKV{Key: "build-resource-target", Value: bi.Target},
	)

	pi, err := build.getV1PushImage(stackConf.namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating push resource")
		return nil, nil, "", err
	}
	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "push-resource-name", Value: bi.Name},
		telemetry.AttributeKV{Key: "push-resource-driver", Value: bi.Driver},
		telemetry.AttributeKV{Key: "push-resource-source", Value: bi.Source},
		telemetry.AttributeKV{Key: "push-resource-target", Value: bi.Target},
	)

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

func getEnvFromRelease(ctx context.Context, client *api.Client, stackName string, projectID uint, clusterID uint) map[string]string {
	ctx, span := telemetry.NewSpan(ctx, "get-env-from-release")
	defer span.End()

	var envVarsStringMap map[string]string
	namespace := fmt.Sprintf("porter-stack-%s", stackName)
	release, err := client.GetRelease(
		ctx,
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
