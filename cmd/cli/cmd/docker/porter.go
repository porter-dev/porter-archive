package docker

import (
	"context"
	"fmt"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

// PorterStartOpts are the options for starting the Porter container
type PorterStartOpts struct {
	Image         string
	StartCmd      []string
	HostPort      uint
	ContainerPort uint
}

// StartPorterContainerAndWait pulls a specific Porter image and starts a container
// using the Docker engine. It returns when the container has stopped.
func (a *Agent) StartPorterContainerAndWait(opts PorterStartOpts) error {
	// pull the specified image
	_, err := a.client.ImagePull(a.ctx, opts.Image, types.ImagePullOptions{})

	if err != nil {
		return a.handleDockerClientErr(err, "Could not pull Porter image")
	}

	// format the port array for binding to host machine
	ports := []string{fmt.Sprintf("127.0.0.1:%d:%d/tcp", opts.HostPort, opts.ContainerPort)}

	_, portBindings, err := nat.ParsePortSpecs(ports)

	if err != nil {
		return fmt.Errorf("Unable to parse port specification %s", ports)
	}

	// create the container with a label specifying this was created via the CLI
	resp, err := a.client.ContainerCreate(a.ctx, &container.Config{
		Image: opts.Image,
		Cmd:   opts.StartCmd,
		Tty:   false,
		Labels: map[string]string{
			"CreatedByPorterCLI": "true",
		},
	}, &container.HostConfig{
		PortBindings: portBindings,
	}, nil, "")

	if err != nil {
		return a.handleDockerClientErr(err, "Could not create Porter container")
	}

	// start the container and listen until the container is stopped
	if err := a.client.ContainerStart(a.ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		return a.handleDockerClientErr(err, "Could not start Porter container")
	}

	statusCh, errCh := a.client.ContainerWait(a.ctx, resp.ID, container.WaitConditionNotRunning)
	select {
	case err := <-errCh:
		if err != nil {
			return a.handleDockerClientErr(err, "Error waiting for stopped container")
		}
	case <-statusCh:
	}

	return nil
}

// StopPorterContainers finds all containers that were started via the CLI and stops them
// without removal.
func (a *Agent) StopPorterContainers() error {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())

	if err != nil {
		panic(err)
	}

	containers, err := a.getContainersCreatedByStart()

	if err != nil {
		return err
	}

	// remove all Porter containers
	for _, container := range containers {
		fmt.Println("removing container", container.ID)
		timeout, _ := time.ParseDuration("15s")

		err := cli.ContainerStop(ctx, container.ID, &timeout)

		if err != nil {
			return a.handleDockerClientErr(err, "Could not stop container "+container.ID)
		}
	}

	return nil
}

// getContainersCreatedByStart gets all containers that were created by the "porter start"
// command by looking for the label "CreatedByPorterCLI"
func (a *Agent) getContainersCreatedByStart() ([]types.Container, error) {
	containers, err := a.client.ContainerList(a.ctx, types.ContainerListOptions{
		All: true,
	})

	if err != nil {
		return nil, a.handleDockerClientErr(err, "Could not list containers")
	}

	res := make([]types.Container, 0)

	for _, container := range containers {
		if contains, ok := container.Labels[a.label]; ok && contains == "true" {
			res = append(res, container)
		}
	}

	return res, nil
}
