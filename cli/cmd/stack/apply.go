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
	stackName            string
	projectID, clusterID uint
}

func CreateV1BuildResources(client *api.Client, raw []byte, stackName string, projectID uint, clusterID uint) (*switchboardTypes.ResourceGroup, error) {
	v1File := &switchboardTypes.ResourceGroup{
		Version: "v1",
		Resources: []*switchboardTypes.Resource{
			{
				Name:   "get-env",
				Driver: "os-env",
			},
		},
	}

	stackConf, err := createStackConf(client, raw, stackName, projectID, clusterID)
	if err != nil {
		return nil, err
	}

	var bi, pi *switchboardTypes.Resource

	if stackConf.parsed.Build != nil {
		bi, pi, err = createV1BuildResourcesFromPorterYaml(stackConf)
		if err != nil {
			color.New(color.FgRed).Printf("Could not build using values specified in porter.yaml (%s), attempting to load stack build settings instead \n", err.Error())
			bi, pi, err = createV1BuildResourcesFromDB(client, stackConf)
			if err != nil {
				return nil, err
			}
		}
	} else {
		bi, pi, err = createV1BuildResourcesFromDB(client, stackConf)
		if err != nil {
			return nil, err
		}
	}

	v1File.Resources = append(v1File.Resources, bi, pi)

	return v1File, nil
}

func createStackConf(client *api.Client, raw []byte, stackName string, projectID uint, clusterID uint) (*StackConf, error) {
	parsed := &PorterStackYAML{}

	err := yaml.Unmarshal(raw, parsed)
	if err != nil {
		errMsg := composePreviewMessage("error parsing porter.yaml", Error)
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	err = config.ValidateCLIEnvironment()
	if err != nil {
		errMsg := composePreviewMessage("porter CLI is not configured correctly", Error)
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	return &StackConf{
		apiClient: client,
		rawBytes:  raw,
		parsed:    parsed,
		stackName: stackName,
		projectID: projectID,
		clusterID: clusterID,
	}, nil
}

func createV1BuildResourcesFromPorterYaml(stackConf *StackConf) (*switchboardTypes.Resource, *switchboardTypes.Resource, error) {
	bi, err := stackConf.parsed.Build.getV1BuildImage(stackConf.parsed.Env)
	if err != nil {
		return nil, nil, err
	}

	pi, err := stackConf.parsed.Build.getV1PushImage()
	if err != nil {
		return nil, nil, err
	}

	return bi, pi, nil
}

func createV1BuildResourcesFromDB(client *api.Client, stackConf *StackConf) (*switchboardTypes.Resource, *switchboardTypes.Resource, error) {
	res, err := client.GetPorterApp(context.Background(), stackConf.projectID, stackConf.clusterID, stackConf.stackName)
	if err != nil {
		return nil, nil, fmt.Errorf("unable to read build info from DB: %w", err)
	}

	if res == nil {
		return nil, nil, fmt.Errorf("stack %s not found", stackConf.stackName)
	}

	build := convertToBuild(res)

	bi, err := build.getV1BuildImage(stackConf.parsed.Env)
	if err != nil {
		return nil, nil, err
	}

	pi, err := build.getV1PushImage()
	if err != nil {
		return nil, nil, err
	}

	return bi, pi, nil
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
			buildpacks[i] = &bp
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
