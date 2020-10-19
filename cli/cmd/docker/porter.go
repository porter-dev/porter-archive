package docker

import (
	"fmt"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/go-connections/nat"
)

// PorterStartOpts are the options for starting the Porter container
type PorterStartOpts struct {
	Name          string
	Image         string
	StartCmd      []string
	HostPort      uint
	ContainerPort uint
	Mounts        []mount.Mount
	VolumeMap     map[string]struct{}
	Env           []string
	NetworkID     string
}

// StartPorterContainer pulls a specific Porter image and starts a container
// using the Docker engine. It returns the container ID
func (a *Agent) StartPorterContainer(opts PorterStartOpts) (string, error) {
	id, err := a.upsertPorterContainer(opts)

	if err != nil {
		return "", err
	}

	err = a.startPorterContainer(id)

	if err != nil {
		return "", err
	}

	// attach container to network
	err = a.ConnectContainerToNetwork(opts.NetworkID, id, opts.Name)

	if err != nil {
		return "", err
	}

	return id, nil
}

// detect if container exists and is running, and stop
// if spec has changed, remove and recreate container
// if container does not exist, create the container
// otherwise, return stopped container
func (a *Agent) upsertPorterContainer(opts PorterStartOpts) (id string, err error) {
	containers, err := a.getContainersCreatedByStart()

	// remove the matching container
	for _, container := range containers {
		if len(container.Names) > 0 && container.Names[0] == "/"+opts.Name {
			timeout, _ := time.ParseDuration("15s")

			err := a.client.ContainerStop(a.ctx, container.ID, &timeout)

			if err != nil {
				return "", a.handleDockerClientErr(err, "Could not stop container "+container.ID)
			}

			err = a.client.ContainerRemove(a.ctx, container.ID, types.ContainerRemoveOptions{})

			if err != nil {
				return "", a.handleDockerClientErr(err, "Could not remove container "+container.ID)
			}
		}
	}

	return a.pullAndCreatePorterContainer(opts)
}

// create the container and return its id
func (a *Agent) pullAndCreatePorterContainer(opts PorterStartOpts) (id string, err error) {
	a.PullImage(opts.Image)

	// format the port array for binding to host machine
	ports := []string{fmt.Sprintf("127.0.0.1:%d:%d/tcp", opts.HostPort, opts.ContainerPort)}

	_, portBindings, err := nat.ParsePortSpecs(ports)

	if err != nil {
		return "", fmt.Errorf("Unable to parse port specification %s", ports)
	}

	labels := make(map[string]string)
	labels[a.label] = "true"

	// create the container with a label specifying this was created via the CLI
	resp, err := a.client.ContainerCreate(a.ctx, &container.Config{
		Image:   opts.Image,
		Cmd:     opts.StartCmd,
		Tty:     false,
		Labels:  labels,
		Volumes: opts.VolumeMap,
		Env:     opts.Env,
	}, &container.HostConfig{
		PortBindings: portBindings,
		Mounts:       opts.Mounts,
	}, nil, opts.Name)

	if err != nil {
		return "", a.handleDockerClientErr(err, "Could not create Porter container")
	}

	return resp.ID, nil
}

// start the container
func (a *Agent) startPorterContainer(id string) error {
	if err := a.client.ContainerStart(a.ctx, id, types.ContainerStartOptions{}); err != nil {
		return a.handleDockerClientErr(err, "Could not start Porter container")
	}

	return nil
}

// PostgresOpts are the options for starting the Postgres DB
type PostgresOpts struct {
	Name      string
	Image     string
	Env       []string
	VolumeMap map[string]struct{}
	Mounts    []mount.Mount
	NetworkID string
}

// StartPostgresContainer pulls a specific Porter image and starts a container
// using the Docker engine
func (a *Agent) StartPostgresContainer(opts PostgresOpts) (string, error) {
	id, err := a.upsertPostgresContainer(opts)

	if err != nil {
		return "", err
	}

	err = a.startPostgresContainer(id)

	if err != nil {
		return "", err
	}

	// attach container to network
	err = a.ConnectContainerToNetwork(opts.NetworkID, id, opts.Name)

	if err != nil {
		return "", err
	}

	return id, nil
}

// detect if container exists and is running, and stop
// if it is running, stop it
// if it is stopped, return id
// if it does not exist, create it and return it
func (a *Agent) upsertPostgresContainer(opts PostgresOpts) (id string, err error) {
	containers, err := a.getContainersCreatedByStart()

	// stop the matching container and return it
	for _, container := range containers {
		if len(container.Names) > 0 && container.Names[0] == "/"+opts.Name {
			timeout, _ := time.ParseDuration("15s")

			err := a.client.ContainerStop(a.ctx, container.ID, &timeout)

			if err != nil {
				return "", a.handleDockerClientErr(err, "Could not stop postgres container "+container.ID)
			}

			return container.ID, nil
		}
	}

	return a.pullAndCreatePostgresContainer(opts)
}

// create the container and return it
func (a *Agent) pullAndCreatePostgresContainer(opts PostgresOpts) (id string, err error) {
	a.PullImage(opts.Image)

	labels := make(map[string]string)
	labels[a.label] = "true"

	// create the container with a label specifying this was created via the CLI
	resp, err := a.client.ContainerCreate(a.ctx, &container.Config{
		Image:   opts.Image,
		Tty:     false,
		Labels:  labels,
		Volumes: opts.VolumeMap,
		Env:     opts.Env,
		ExposedPorts: nat.PortSet{
			"5432": struct{}{},
		},
		Healthcheck: &container.HealthConfig{
			Test:     []string{"CMD-SHELL", "pg_isready"},
			Interval: 10 * time.Second,
			Timeout:  5 * time.Second,
			Retries:  3,
		},
	}, &container.HostConfig{
		Mounts: opts.Mounts,
	}, nil, opts.Name)

	if err != nil {
		return "", a.handleDockerClientErr(err, "Could not create Porter container")
	}

	return resp.ID, nil
}

// start the container in the background
func (a *Agent) startPostgresContainer(id string) error {
	if err := a.client.ContainerStart(a.ctx, id, types.ContainerStartOptions{}); err != nil {
		return a.handleDockerClientErr(err, "Could not start Postgres container")
	}

	return nil
}

// StopPorterContainers finds all containers that were started via the CLI and stops them
// without removal.
func (a *Agent) StopPorterContainers() error {
	fmt.Println("Stopping containers...")

	containers, err := a.getContainersCreatedByStart()

	if err != nil {
		return err
	}

	// remove all Porter containers
	for _, container := range containers {
		timeout, _ := time.ParseDuration("15s")

		err := a.client.ContainerStop(a.ctx, container.ID, &timeout)

		if err != nil {
			return a.handleDockerClientErr(err, "Could not stop container "+container.ID)
		}
	}

	return nil
}

// getContainersCreatedByStart gets all containers that were created by the "porter start"
// command by looking for the label "CreatedByPorterCLI" (or .label of the agent)
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
