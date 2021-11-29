package pack

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/buildpacks/pack"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/porter/internal/integrations/buildpacks"
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
		Builder:         buildpacks.DefaultBuilder,
		AppPath:         opts.BuildContext,
		TrustBuilder:    true,
		Env:             opts.Env,
	}

	if buildConfig != nil {
		buildOpts.Builder = buildConfig.Builder
		if len(buildConfig.Buildpacks) > 0 {
			buildOpts.Buildpacks = buildConfig.Buildpacks
		}
		// FIXME: use all the config vars
	}

	if strings.HasPrefix(buildOpts.Builder, "paketo") {
		buildOpts.Buildpacks = append(buildOpts.Buildpacks, "porterhub/paketo-build-plan:latest")
	}

	return client.Build(context, buildOpts)
}
