package pack

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"

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
		Builder:         "paketobuildpacks/builder:full",
		AppPath:         opts.BuildContext,
		TrustBuilder:    true,
		Env:             opts.Env,
		// Builder:            "paketobuildpacks/builder:tiny",
		// DefaultProcessType: "some-custom-command from Procfile",
		// Buildpacks:         []string{"gcr.io/paketo-buildpacks/procfile"},
	}

	if buildConfig != nil {
		var buildpacks buildpacks.BuildpackInfo
		err = json.Unmarshal(buildConfig.Buildpacks, &buildpacks)
		if err == nil {
			var packs []string
			for i := range buildpacks.Packs {
				packs = append(packs, fmt.Sprintf("%s@%s", buildpacks.Packs[i].ID, buildpacks.Packs[i].Version))
			}
			if len(packs) > 0 {
				buildOpts.Builder = "paketobuildpacks/builder:tiny"
				buildOpts.Buildpacks = packs
			}
		}
	}

	if buildConfig != nil {
		buildOpts.Builder = buildConfig.Builder
		if len(buildConfig.Buildpacks) > 0 {
			buildOpts.Buildpacks = buildConfig.Buildpacks
		}
		// FIXME: use all the config vars
	}

	return client.Build(context, buildOpts)
}
