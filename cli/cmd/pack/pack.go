package pack

import (
	"context"
	"fmt"

	"github.com/buildpacks/pack"
	"github.com/porter-dev/porter/cli/cmd/docker"
)

type Agent struct{}

func (a *Agent) Build(opts *docker.BuildOpts) error {
	//create a context object
	context := context.Background()

	//initialize a pack client
	client, err := pack.NewClient()
	if err != nil {
		panic(err)
	}

	buildOpts := pack.BuildOptions{
		Image:        fmt.Sprintf("%s:%s", opts.ImageRepo, opts.Tag),
		Builder:      "heroku/buildpacks:18",
		AppPath:      opts.BuildContext,
		TrustBuilder: true,
		Env:          opts.Env,
	}

	return client.Build(context, buildOpts)
}
