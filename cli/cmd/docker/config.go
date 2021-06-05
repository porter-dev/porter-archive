package docker

import (
	"context"

	"github.com/docker/docker/client"
	api "github.com/porter-dev/porter/api/client"
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

func NewAgentWithAuthGetter(client *api.Client, projID uint) (*Agent, error) {
	agent, err := NewAgentFromEnv()

	if err != nil {
		return nil, err
	}

	cache := NewFileCredentialsCache()

	authGetter := &AuthGetter{
		Client:    client,
		Cache:     cache,
		ProjectID: projID,
	}

	agent.authGetter = authGetter

	return agent, nil
}
