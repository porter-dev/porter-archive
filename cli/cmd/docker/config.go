package docker

import (
	"context"

	"github.com/docker/docker/client"
	api "github.com/porter-dev/porter/api/client"
)

const label = "CreatedByPorterCLI"

// NewAgentFromEnv creates a new Docker agent using the environment variables set
// on the host
func NewAgentFromEnv(ctx context.Context) (*Agent, error) {
	cli, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return nil, err
	}

	return &Agent{
		Client: cli,
		label:  label,
	}, nil
}

// NewAgentWithAuthGetter returns a docker agent which can connect to a given registry
func NewAgentWithAuthGetter(ctx context.Context, client api.Client, projID uint) (*Agent, error) {
	agent, err := NewAgentFromEnv(ctx)
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
