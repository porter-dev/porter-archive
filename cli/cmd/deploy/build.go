package deploy

import (
	"fmt"

	"github.com/porter-dev/porter/cli/cmd/api"
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
func (b *BuildAgent) BuildDocker(dockerAgent *docker.Agent, dst, tag string) error {
	opts := &docker.BuildOpts{
		ImageRepo:    b.imageRepo,
		Tag:          tag,
		BuildContext: dst,
		Env:          b.env,
	}

	return dockerAgent.BuildLocal(
		opts,
		b.LocalDockerfile,
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
