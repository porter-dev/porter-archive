package docker

import (
	"context"
	"fmt"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/filters"
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

	return &vol, err
}

// ------------------------- AGENT HELPER FUNCTIONS ------------------------- //

func (a *Agent) handleDockerClientErr(err error, errPrefix string) error {
	if strings.Contains(err.Error(), "Cannot connect to the Docker daemon") {
		return fmt.Errorf("The Docker daemon must be running in order to start Porter: connection to %s failed", a.client.DaemonHost())
	}

	return fmt.Errorf("%s:%s", errPrefix, err.Error())
}
