package pack

import (
	"context"
	"fmt"
	"path/filepath"

	"github.com/buildpacks/pack"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/docker"
)

type Agent struct{}

func (a *Agent) Build(opts *docker.BuildOpts, buildConfig *types.BuildConfig) error {
	//create a context object
	context := context.Background()

	//initialize a pack client
	client, err := pack.NewClient()

	if err != nil {
		return err
	}

	absPath, err := filepath.Abs(opts.BuildContext)

	if err != nil {
		return err
	}

	buildOpts := pack.BuildOptions{
		RelativeBaseDir: filepath.Dir(absPath),
		Image:           fmt.Sprintf("%s:%s", opts.ImageRepo, opts.Tag),
		Builder:         "paketobuildpacks/builder:full",
		AppPath:         opts.BuildContext,
		TrustBuilder:    true,
		Env:             opts.Env,
	}

	if buildConfig != nil {
		buildOpts.Builder = buildConfig.Builder
		buildOpts.Buildpacks = buildConfig.Buildpacks
		// FIXME: use all the config vars
	}

	return client.Build(context, buildOpts)
}
