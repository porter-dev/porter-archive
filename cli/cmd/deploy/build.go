package deploy

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/porter/cli/cmd/pack"
)

// BuildAgent builds a new Docker container image for a new version of an application
type BuildAgent struct {
	*SharedOpts

	client      *api.Client
	imageRepo   string
	env         map[string]string
	imageExists bool
}

// BuildDocker uses the local Docker daemon to build the image
func (b *BuildAgent) BuildDocker(
	dockerAgent *docker.Agent,
	basePath,
	buildCtx,
	dockerfilePath,
	tag string,
) error {
	buildCtx, dockerfilePath, isDockerfileInCtx, err := ResolveDockerPaths(
		basePath,
		buildCtx,
		dockerfilePath,
	)

	if err != nil {
		return err
	}

	opts := &docker.BuildOpts{
		ImageRepo:         b.imageRepo,
		Tag:               tag,
		BuildContext:      buildCtx,
		Env:               b.env,
		DockerfilePath:    dockerfilePath,
		IsDockerfileInCtx: isDockerfileInCtx,
	}

	return dockerAgent.BuildLocal(
		opts,
	)
}

// BuildPack uses the cloud-native buildpack client to build a container image
func (b *BuildAgent) BuildPack(dockerAgent *docker.Agent, dst, tag string) error {
	// retag the image with "pack-cache" tag so that it doesn't re-pull from the registry
	if b.imageExists {
		err := dockerAgent.TagImage(
			fmt.Sprintf("%s:%s", b.imageRepo, tag),
			fmt.Sprintf("%s:%s", b.imageRepo, "pack-cache"),
		)

		if err != nil {
			return err
		}
	}

	// create pack agent and build opts
	packAgent := &pack.Agent{}

	opts := &docker.BuildOpts{
		ImageRepo: b.imageRepo,
		// We tag the image with a stable param "pack-cache" so that pack can use the
		// local image without attempting to re-pull from registry. We handle getting
		// registry credentials and pushing/pulling the image.
		Tag:          "pack-cache",
		BuildContext: dst,
		Env:          b.env,
	}

	// call builder
	err := packAgent.Build(opts)

	if err != nil {
		return err
	}

	return dockerAgent.TagImage(
		fmt.Sprintf("%s:%s", b.imageRepo, "pack-cache"),
		fmt.Sprintf("%s:%s", b.imageRepo, tag),
	)
}

// ResolveDockerPaths returns a path to the dockerfile that is either relative or absolute, and a path
// to the build context that is absolute.
//
// The return value will be relative if the dockerfile exists within the build context, absolute
// otherwise. The second return value is true if the dockerfile exists within the build context,
// false otherwise.
func ResolveDockerPaths(
	basePath string,
	buildContextPath string,
	dockerfilePath string,
) (
	resBuildCtxPath string,
	resDockerfilePath string,
	isDockerfileRelative bool,
	err error,
) {
	resBuildCtxPath, err = filepath.Abs(buildContextPath)
	resDockerfilePath = dockerfilePath

	// determine if the given dockerfile path is relative
	if !filepath.IsAbs(dockerfilePath) {
		// if path is relative, join basepath with path
		resDockerfilePath = filepath.Join(basePath, dockerfilePath)
	}

	// compare the path to the dockerfile with the build context
	pathComp, err := filepath.Rel(resBuildCtxPath, resDockerfilePath)

	if err != nil {
		return "", "", false, err
	}

	if !strings.HasPrefix(pathComp, ".."+string(os.PathSeparator)) {
		// return the relative path to the dockerfile
		return resBuildCtxPath, pathComp, true, nil
	}

	resDockerfilePath, err = filepath.Abs(resDockerfilePath)

	if err != nil {
		return "", "", false, err
	}

	return resBuildCtxPath, resDockerfilePath, false, nil
}
