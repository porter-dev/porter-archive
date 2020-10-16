package docker

import (
	"context"

	"github.com/docker/docker/client"
)

const label = "CreatedByPorterCLI"

// NewAgentFromEnv creates a new Docker agent using the environment variables set
// on the host
func NewAgentFromEnv() (*Agent, error) {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)

	if err != nil {
		return nil, err
	}

	return &Agent{
		client: cli,
		ctx:    ctx,
		label:  label,
	}, nil
}
