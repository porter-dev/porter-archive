package build

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/pack"

	"github.com/porter-dev/porter/cli/cmd/docker"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
)

type Settings struct {
	ProjectID       uint
	AppName         string
	BuildContext    string
	BuildDockerfile string
	BuildMethod     string
	Builder         string
	BuildPacks      []string
	ImageTag        string
	CurrentImageTag string
	RepositoryURL   string
}

type BuildInput struct {
	Settings Settings
}

func Run(ctx context.Context, cliConf *config.CLIConfig, client *api.Client, settings Settings) error {
	if settings.ProjectID == 0 {
		return errors.New("must specify a project id")
	}
	projectID := settings.ProjectID

	if settings.ImageTag == "" {
		return errors.New("must specify an image tag")
	}
	tag := settings.ImageTag

	if settings.RepositoryURL == "" {
		return errors.New("must specify a registry url")
	}
	imageURL := strings.TrimPrefix(settings.RepositoryURL, "https://")

	err := createImageRepositoryIfNotExists(ctx, client, projectID, imageURL)
	if err != nil {
		return fmt.Errorf("error creating image repository: %w", err)
	}

	dockerAgent, err := docker.NewAgentWithAuthGetter(client, projectID)
	if err != nil {
		return fmt.Errorf("error getting docker agent: %w", err)
	}

	switch settings.BuildMethod {
	case "docker":
		basePath, err := filepath.Abs(".")
		if err != nil {
			return fmt.Errorf("error getting absolute path: %w", err)
		}

		buildCtx, dockerfilePath, isDockerfileInCtx, err := resolveDockerPaths(
			basePath,
			settings.BuildContext,
			settings.BuildDockerfile,
		)
		if err != nil {
			return fmt.Errorf("error resolving docker paths: %w", err)
		}

		opts := &docker.BuildOpts{
			ImageRepo:         settings.RepositoryURL,
			Tag:               tag,
			CurrentTag:        settings.CurrentImageTag,
			BuildContext:      buildCtx,
			DockerfilePath:    dockerfilePath,
			IsDockerfileInCtx: isDockerfileInCtx,
		}

		err = dockerAgent.BuildLocal(
			opts,
		)
		if err != nil {
			return fmt.Errorf("error building image with docker: %w", err)
		}
	case "pack":
		packAgent := &pack.Agent{}

		opts := &docker.BuildOpts{
			ImageRepo:    imageURL,
			Tag:          tag,
			BuildContext: settings.BuildContext,
		}

		buildConfig := &types.BuildConfig{
			Builder:    settings.Builder,
			Buildpacks: settings.BuildPacks,
		}

		err := packAgent.Build(opts, buildConfig, "")
		if err != nil {
			return fmt.Errorf("error building image with pack: %w", err)
		}
	default:
		return fmt.Errorf("invalid build method: %s", settings.BuildMethod)
	}

	err = dockerAgent.PushImage(fmt.Sprintf("%s:%s", imageURL, tag))
	if err != nil {
		return fmt.Errorf("error pushing image url: %w\n", err)
	}

	return nil
}

func createImageRepositoryIfNotExists(ctx context.Context, client *api.Client, projectID uint, imageURL string) error {
	if projectID == 0 {
		return errors.New("must specify a project id")
	}

	if imageURL == "" {
		return errors.New("must specify an image url")
	}

	regList, err := client.ListRegistries(ctx, projectID)
	if err != nil {
		return fmt.Errorf("error calling list registries: %w", err)
	}

	if regList == nil {
		return errors.New("registry list is nil")
	}

	if len(*regList) == 0 {
		return errors.New("no registries found for project")
	}

	var registryID uint
	for _, registry := range *regList {
		if strings.Contains(strings.TrimPrefix(imageURL, "https://"), strings.TrimPrefix(registry.URL, "https://")) {
			registryID = registry.ID
			break
		}
	}

	if registryID == 0 {
		return errors.New("no registries match url")
	}

	err = client.CreateRepository(
		ctx,
		projectID,
		registryID,
		&types.CreateRegistryRepositoryRequest{
			ImageRepoURI: imageURL,
		},
	)
	if err != nil {
		return fmt.Errorf("error creating repository: %w", err)
	}

	return nil
}

// resolveDockerPaths returns a path to the dockerfile that is either relative or absolute, and a path
// to the build context that is absolute.
//
// The return value will be relative if the dockerfile exists within the build context, absolute
// otherwise. The second return value is true if the dockerfile exists within the build context,
// false otherwise.
func resolveDockerPaths(basePath string, buildContextPath string, dockerfilePath string) (
	absoluteBuildContextPath string,
	outputDockerfilePath string,
	isDockerfileRelative bool,
	err error,
) {
	absoluteBuildContextPath, err = filepath.Abs(buildContextPath)
	if err != nil {
		return "", "", false, fmt.Errorf("error getting absolute path: %w", err)
	}
	outputDockerfilePath = dockerfilePath

	if !filepath.IsAbs(dockerfilePath) {
		outputDockerfilePath = filepath.Join(basePath, dockerfilePath)
	}

	pathComp, err := filepath.Rel(absoluteBuildContextPath, outputDockerfilePath)
	if err != nil {
		return "", "", false, fmt.Errorf("error getting relative path: %w", err)
	}

	if !strings.HasPrefix(pathComp, ".."+string(os.PathSeparator)) {
		isDockerfileRelative = true
		return absoluteBuildContextPath, pathComp, isDockerfileRelative, nil
	}
	isDockerfileRelative = false

	outputDockerfilePath, err = filepath.Abs(outputDockerfilePath)
	if err != nil {
		return "", "", false, err
	}

	return absoluteBuildContextPath, outputDockerfilePath, isDockerfileRelative, nil
}
