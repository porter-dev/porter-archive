package docker

import (
	"context"
	"fmt"
	"strings"

	"github.com/docker/docker/client"
)

// Agent is a Docker client for performing operations that interact
// with the Docker engine over REST
type Agent struct {
	client *client.Client
	ctx    context.Context
	label  string
}

// ------------------------- AGENT HELPER FUNCTIONS ------------------------- //

func (a *Agent) handleDockerClientErr(err error, errPrefix string) error {
	if strings.Contains(err.Error(), "Cannot connect to the Docker daemon") {
		return fmt.Errorf("The Docker daemon must be running in order to start Porter: connection to %s failed", a.client.DaemonHost())
	}

	return fmt.Errorf("%s:%s", errPrefix, err.Error())
}
