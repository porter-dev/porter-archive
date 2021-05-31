package create

import (
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/docker"
)

// CreateAgent handles the creation of a new application on Porter
type CreateAgent struct {
	client *api.Client
	agent  *docker.Agent
	opts   *CreateOpts
}

// CreateOpts are the options for creating a new CreateAgent
type CreateOpts struct {
	ProjectID uint
	ClusterID uint
	Namespace string
}

func (c *CreateAgent) CreateFromDocker() error {
	// read values from local file

	// overwrite with docker image repository and tag

	// call subdomain creation if necessary

	return nil
}
