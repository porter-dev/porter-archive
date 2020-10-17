package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
)

// Agent is a Docker client for performing operations that interact
// with the Docker engine over REST
type Agent struct {
	client *client.Client
	ctx    context.Context
	label  string
}

// CreateLocalVolumeIfNotExist creates a volume using driver type "local" with the
// given name if it does not exist. If the volume does exist but does not contain
// the required label (a.label), an error is thrown.
func (a *Agent) CreateLocalVolumeIfNotExist(name string) (*types.Volume, error) {
	volListBody, err := a.client.VolumeList(a.ctx, filters.Args{})

	if err != nil {
		return nil, a.handleDockerClientErr(err, "Could not list volumes")
	}

	for _, _vol := range volListBody.Volumes {
		if contains, ok := _vol.Labels[a.label]; ok && contains == "true" && _vol.Name == name {
			return _vol, nil
		} else if !ok && _vol.Name == name {
			return nil, fmt.Errorf("volume conflict for %s: please remove existing volume and try again", name)
		}
	}

	return a.CreateLocalVolume(name)
}

// CreateLocalVolume creates a volume using driver type "local" with no
// configured options. The equivalent of:
//
// docker volume create --driver local [name]
func (a *Agent) CreateLocalVolume(name string) (*types.Volume, error) {
	labels := make(map[string]string)
	labels[a.label] = "true"

	opts := volume.VolumeCreateBody{
		Name:   name,
		Driver: "local",
		Labels: labels,
	}

	vol, err := a.client.VolumeCreate(a.ctx, opts)

	if err != nil {
		return nil, a.handleDockerClientErr(err, "Could not create volume "+name)
	}

	return &vol, nil
}

// CreateBridgeNetworkIfNotExist creates a volume using driver type "local" with the
// given name if it does not exist. If the volume does exist but does not contain
// the required label (a.label), an error is thrown.
func (a *Agent) CreateBridgeNetworkIfNotExist(name string) (id string, err error) {
	networks, err := a.client.NetworkList(a.ctx, types.NetworkListOptions{})

	if err != nil {
		return "", a.handleDockerClientErr(err, "Could not list volumes")
	}

	for _, net := range networks {
		if contains, ok := net.Labels[a.label]; ok && contains == "true" && net.Name == name {
			return net.ID, nil
		} else if !ok && net.Name == name {
			return "", fmt.Errorf("network conflict for %s: please remove existing network and try again", name)
		}
	}

	return a.CreateBridgeNetwork(name)
}

// CreateBridgeNetwork creates a volume using the default driver type (bridge)
// with the CLI label attached
func (a *Agent) CreateBridgeNetwork(name string) (id string, err error) {
	labels := make(map[string]string)
	labels[a.label] = "true"

	opts := types.NetworkCreate{
		Labels:     labels,
		Attachable: true,
	}

	net, err := a.client.NetworkCreate(a.ctx, name, opts)

	if err != nil {
		return "", a.handleDockerClientErr(err, "Could not create network "+name)
	}

	return net.ID, nil
}

// ConnectContainerToNetwork attaches a container to a specified network
func (a *Agent) ConnectContainerToNetwork(networkID, containerID, containerName string) error {
	// check if the container is connected already
	net, err := a.client.NetworkInspect(a.ctx, networkID, types.NetworkInspectOptions{})

	if err != nil {
		return a.handleDockerClientErr(err, "Could not inspect network"+networkID)
	}

	for _, cont := range net.Containers {
		// if container is connected, just return
		if cont.Name == containerName {
			return nil
		}
	}

	return a.client.NetworkConnect(a.ctx, networkID, containerID, &network.EndpointSettings{})
}

// PullImageEvent represents a response from the Docker API with an image pull event
type PullImageEvent struct {
	Status         string `json:"status"`
	Error          string `json:"error"`
	Progress       string `json:"progress"`
	ProgressDetail struct {
		Current int `json:"current"`
		Total   int `json:"total"`
	} `json:"progressDetail"`
}

// PullImage pulls an image specified by the image string
func (a *Agent) PullImage(image string) error {
	fmt.Println("Pulling image:", image)

	// pull the specified image
	out, err := a.client.ImagePull(a.ctx, image, types.ImagePullOptions{})

	if err != nil {
		return a.handleDockerClientErr(err, "Could not pull image"+image)
	}

	decoder := json.NewDecoder(out)

	var event *PullImageEvent

	for {
		if err := decoder.Decode(&event); err != nil {
			if err == io.EOF {
				break
			}

			return err
		}
	}

	fmt.Println("Finished pulling image:", image)

	return nil
}

// WaitForContainerStop waits until a container has stopped to exit
func (a *Agent) WaitForContainerStop(id string) error {
	// wait for container to stop before exit
	statusCh, errCh := a.client.ContainerWait(a.ctx, id, container.WaitConditionNotRunning)

	select {
	case err := <-errCh:
		if err != nil {
			return a.handleDockerClientErr(err, "Error waiting for stopped container")
		}
	case <-statusCh:
	}

	return nil
}

// ------------------------- AGENT HELPER FUNCTIONS ------------------------- //

func (a *Agent) handleDockerClientErr(err error, errPrefix string) error {
	if strings.Contains(err.Error(), "Cannot connect to the Docker daemon") {
		return fmt.Errorf("The Docker daemon must be running in order to start Porter: connection to %s failed", a.client.DaemonHost())
	}

	return fmt.Errorf("%s:%s", errPrefix, err.Error())
}
