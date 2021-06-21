package docker

import (
	"context"
	"fmt"
	"os"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/pkg/archive"
	"github.com/moby/moby/pkg/jsonmessage"
	"github.com/moby/term"
)

type BuildOpts struct {
	ImageRepo    string
	Tag          string
	BuildContext string
	Env          map[string]string
}

// BuildLocal
func (a *Agent) BuildLocal(opts *BuildOpts, dockerfilePath string) error {
	tar, err := archive.TarWithOptions(opts.BuildContext, &archive.TarOptions{})

	if err != nil {
		return err
	}

	buildArgs := make(map[string]*string)

	for key, val := range opts.Env {
		valCopy := val
		buildArgs[key] = &valCopy
	}

	out, err := a.client.ImageBuild(context.Background(), tar, types.ImageBuildOptions{
		Dockerfile: dockerfilePath,
		BuildArgs:  buildArgs,
		Tags: []string{
			fmt.Sprintf("%s:%s", opts.ImageRepo, opts.Tag),
		},
		Remove: true,
	})

	if err != nil {
		return err
	}

	defer out.Body.Close()

	termFd, isTerm := term.GetFdInfo(os.Stderr)

	return jsonmessage.DisplayJSONMessagesStream(out.Body, os.Stderr, termFd, isTerm, nil)
}
