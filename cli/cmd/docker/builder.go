package docker

import (
	"context"
	"os"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/pkg/archive"
	"github.com/moby/moby/pkg/jsonmessage"
	"github.com/moby/term"
)

// BuildLocal
func (a *Agent) BuildLocal(dockerfilePath, tag, buildContext string) error {
	tar, err := archive.TarWithOptions(buildContext, &archive.TarOptions{})

	if err != nil {
		return err
	}

	out, err := a.client.ImageBuild(context.Background(), tar, types.ImageBuildOptions{
		Dockerfile: dockerfilePath,
		Tags:       []string{tag},
		Remove:     true,
	})

	if err != nil {
		return err
	}

	defer out.Body.Close()

	termFd, isTerm := term.GetFdInfo(os.Stderr)

	return jsonmessage.DisplayJSONMessagesStream(out.Body, os.Stderr, termFd, isTerm, nil)
}
