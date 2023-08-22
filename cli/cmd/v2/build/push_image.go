package build

import (
	"context"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/docker"
)

type PushImageInput struct {
	ProjectID uint
	AppName   string
	ImageURL  string
	Tag       string
}

func PushImage(ctx context.Context, client *api.Client, dockerAgent *docker.Agent, inp PushImageInput) error {
	return nil
}
