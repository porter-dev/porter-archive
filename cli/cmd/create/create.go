package create

import (
	"fmt"
	"os"
	"path/filepath"

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

type CreateConfig struct {
	DockerfilePath string
}

func (c *CreateAgent) DetectConfig(buildPath string) (*CreateConfig, error) {
	// detect if there is a dockerfile at the path `./Dockerfile`
	dockerFilePath := filepath.Join(buildPath, "./Dockerfile")

	if info, err := os.Stat(dockerFilePath); !os.IsNotExist(err) && !info.IsDir() {
		// path/to/whatever does not exist
		return &CreateConfig{
			DockerfilePath: dockerFilePath,
		}, nil
	}

	return nil, fmt.Errorf("no supported build configuration detected")
}
