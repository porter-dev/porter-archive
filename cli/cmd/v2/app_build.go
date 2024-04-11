package v2

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
	v2 "github.com/porter-dev/porter/internal/porter_app/v2"
)

// AppBuildInput is the input to the AppBuild function
type AppBuildInput struct {
	// CLIConfig is the CLI configuration
	CLIConfig config.CLIConfig
	// Client is the Porter API client
	Client api.Client
	// AppName is the name of the app
	AppName string
	// DeploymentTargetName is the name of the deployment target, if provided
	DeploymentTargetName string
	// BuildMethod is the build method for the app on apply, either 'docker' or 'pack'
	BuildMethod string
	// Dockerfile is the path to the Dockerfile when build method is 'docker'
	Dockerfile string
	// Builder is the builder to use when build method is 'pack'
	Builder string
	// Buildpacks is the buildpacks to use when build method is 'pack'
	Buildpacks []string
	// BuildContext is the build context for the app, e.g. ./app
	BuildContext string
	// ImageTag is the image tag to use for the app build
	ImageTag string
	// PatchOperations is the set of patch operations to apply to the app build
	PatchOperations []v2.PatchOperation
	// PullImageBeforeBuild is a flag indicating whether to pull the previous image before building
	PullImageBeforeBuild bool
}

// AppBuild builds an app using a combination of the provided flag values and build settings from the latest app revision
func AppBuild(ctx context.Context, inp AppBuildInput) error {
	cliConf := inp.CLIConfig
	client := inp.Client

	if cliConf.Project == 0 {
		return errors.New("project must be set")
	}

	if cliConf.Cluster == 0 {
		return errors.New("cluster must be set")
	}

	latest, err := client.CurrentAppRevision(ctx, api.CurrentAppRevisionInput{
		ProjectID:            cliConf.Project,
		ClusterID:            cliConf.Cluster,
		AppName:              inp.AppName,
		DeploymentTargetName: inp.DeploymentTargetName,
	})
	if err != nil {
		return fmt.Errorf("error getting latest app revision: %s", err)
	}

	buildSettings, err := client.GetBuildFromRevision(ctx, api.GetBuildFromRevisionInput{
		ProjectID:       cliConf.Project,
		ClusterID:       cliConf.Cluster,
		AppName:         inp.AppName,
		AppRevisionID:   latest.AppRevision.ID,
		PatchOperations: inp.PatchOperations,
	})
	if err != nil {
		return fmt.Errorf("error getting build from revision: %w", err)
	}

	tagForBuild, err := tagFromCommitSHAOrFlag(inp.ImageTag)
	if err != nil {
		return fmt.Errorf("error getting tag for build: %w", err)
	}

	buildEnvVariables := make(map[string]string)
	for k, v := range buildSettings.BuildEnvVariables {
		buildEnvVariables[k] = v
	}

	// use all env variables from running container in build
	env := os.Environ()
	for _, v := range env {
		pair := strings.SplitN(v, "=", 2)
		if len(pair) == 2 {
			if strings.HasPrefix(pair[0], "PORTER_") || strings.HasPrefix(pair[0], "NEXT_PUBLIC_") {
				buildEnvVariables[pair[0]] = pair[1]
			}
		}
	}

	buildInput, err := buildInputFromBuildSettings(buildInputFromBuildSettingsInput{
		projectID:            cliConf.Project,
		appName:              inp.AppName,
		commitSHA:            tagForBuild,
		image:                buildSettings.Image,
		build:                buildSettings.Build,
		buildEnv:             buildEnvVariables,
		pullImageBeforeBuild: inp.PullImageBeforeBuild,
	})
	if err != nil {
		return fmt.Errorf("error creating build input from build settings: %w", err)
	}

	// skip push when only a build is requested
	buildInput.SkipPush = true

	buildOutput := build(ctx, client, buildInput)
	if buildOutput.Error != nil {
		return fmt.Errorf("error building app: %w", buildOutput.Error)
	}

	color.New(color.FgGreen).Printf("Successfully built image (tag: %s)\n", tagForBuild) // nolint:errcheck,gosec

	return nil
}

func tagFromCommitSHAOrFlag(providedTag string) (string, error) {
	tag := commitSHAFromEnv()

	if providedTag != "" {
		tag = providedTag
	}

	if tag == "" {
		return tag, errors.New("no tag set and could not determine latest commit SHA")
	}

	return tag, nil
}
