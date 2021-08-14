package docker

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/docker/distribution/reference"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"github.com/moby/moby/pkg/jsonmessage"
	"github.com/moby/term"
)

// Agent is a Docker client for performing operations that interact
// with the Docker engine over REST
type Agent struct {
	authGetter *AuthGetter
	client     *client.Client
	ctx        context.Context
	label      string
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

// RemoveLocalVolume removes a volume by name
func (a *Agent) RemoveLocalVolume(name string) error {
	return a.client.VolumeRemove(a.ctx, name, true)
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

func (a *Agent) TagImage(old, new string) error {
	return a.client.ImageTag(a.ctx, old, new)
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

var PullImageErrNotFound = fmt.Errorf("Requested image not found")

var PullImageErrUnauthorized = fmt.Errorf("Could not pull image: unauthorized")

// PullImage pulls an image specified by the image string
func (a *Agent) PullImage(image string) error {
	opts, err := a.getPullOptions(image)

	if err != nil {
		return err
	}

	// pull the specified image
	out, err := a.client.ImagePull(a.ctx, image, opts)

	if err != nil {
		if client.IsErrNotFound(err) {
			return PullImageErrNotFound
		} else if client.IsErrUnauthorized(err) {
			return PullImageErrUnauthorized
		} else {
			return a.handleDockerClientErr(err, "Could not pull image "+image)
		}
	}

	defer out.Close()

	termFd, isTerm := term.GetFdInfo(os.Stderr)

	return jsonmessage.DisplayJSONMessagesStream(out, os.Stderr, termFd, isTerm, nil)
}

// PushImage pushes an image specified by the image string
func (a *Agent) PushImage(image string, retryCount int) error {
	var err error

	opts, err := a.getPushOptions(image)

	if err != nil {
		return err
	}

	var out io.ReadCloser

	for i := 0; i < retryCount; i++ {
		out, err = a.client.ImagePush(
			context.Background(),
			image,
			opts,
		)

		if err != nil {
			time.Sleep(1 * time.Second)
			continue
		}

		defer out.Close()

		termFd, isTerm := term.GetFdInfo(os.Stderr)

		return jsonmessage.DisplayJSONMessagesStream(out, os.Stderr, termFd, isTerm, nil)
	}

	return err
}

func (a *Agent) getPullOptions(image string) (types.ImagePullOptions, error) {
	// check if agent has an auth getter; otherwise, assume public usage
	if a.authGetter == nil {
		return types.ImagePullOptions{}, nil
	}

	// get using server url
	serverURL, err := GetServerURLFromTag(image)

	if err != nil {
		return types.ImagePullOptions{}, err
	}

	user, secret, err := a.authGetter.GetCredentials(serverURL)

	if err != nil {
		return types.ImagePullOptions{}, err
	}

	var authConfig = types.AuthConfig{
		Username:      user,
		Password:      secret,
		ServerAddress: "https://" + serverURL,
	}

	authConfigBytes, _ := json.Marshal(authConfig)
	authConfigEncoded := base64.URLEncoding.EncodeToString(authConfigBytes)

	return types.ImagePullOptions{
		RegistryAuth: authConfigEncoded,
	}, nil
}

func (a *Agent) getPushOptions(image string) (types.ImagePushOptions, error) {
	pullOpts, err := a.getPullOptions(image)

	return types.ImagePushOptions(pullOpts), err
}

func GetServerURLFromTag(image string) (string, error) {
	named, err := reference.ParseNamed(image)

	if err != nil {
		return "", err
	}

	domain := reference.Domain(named)

	// if domain name is empty, use index.docker.io/v1
	if domain == "" {
		return "index.docker.io/v1", nil
	}

	return domain, nil

	// else if matches := ecrPattern.FindStringSubmatch(image); matches >= 3 {
	// 	// if this matches ECR, just use the domain name
	// 	return domain, nil
	// } else if strings.Contains(image, "gcr.io") || strings.Contains(image, "registry.digitalocean.com") {
	// 	// if this matches GCR or DOCR, use the first path component
	// 	return fmt.Sprintf("%s/%s", domain, strings.Split(path, "/")[0]), nil
	// }

	// // otherwise, best-guess is to get components of path that aren't the image name
	// pathParts := strings.Split(path, "/")
	// nonImagePath := ""

	// if len(pathParts) > 1 {
	// 	nonImagePath = strings.Join(pathParts[0:len(pathParts)-1], "/")
	// }

	// if err != nil {
	// 	return "", err
	// }

	// return fmt.Sprintf("%s/%s", domain, nonImagePath), nil
}

// func imagePush(dockerClient *client.Client) error {
// 	ctx, cancel := context.WithTimeout(context.Background(), time.Second*120)
// 	defer cancel()

// 	authConfigBytes, _ := json.Marshal(authConfig)
// 	authConfigEncoded := base64.URLEncoding.EncodeToString(authConfigBytes)

// 	tag := dockerRegistryUserID + "/node-hello"
// 	opts := types.ImagePushOptions{RegistryAuth: authConfigEncoded}
// 	rd, err := dockerClient.ImagePush(ctx, tag, opts)
// 	if err != nil {
// 		return err
// 	}

// 	defer rd.Close()

// 	err = print(rd)
// 	if err != nil {
// 		return err
// 	}

// 	return nil
// }

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

// WaitForContainerHealthy waits until a container is returning a healthy status. Streak
// is the maximum number of failures in a row, while timeout is the length of time between
// checks.
func (a *Agent) WaitForContainerHealthy(id string, streak int) error {
	for {
		cont, err := a.client.ContainerInspect(a.ctx, id)

		if err != nil {
			return a.handleDockerClientErr(err, "Error waiting for stopped container")
		}

		health := cont.State.Health

		if health == nil || health.Status == "healthy" {
			return nil
		} else if health.FailingStreak >= streak {
			break
		}

		time.Sleep(time.Second)
	}

	return errors.New("container not healthy")
}

// ------------------------- AGENT HELPER FUNCTIONS ------------------------- //

func (a *Agent) handleDockerClientErr(err error, errPrefix string) error {
	if strings.Contains(err.Error(), "Cannot connect to the Docker daemon") {
		return fmt.Errorf("The Docker daemon must be running in order to start Porter: connection to %s failed", a.client.DaemonHost())
	}

	return fmt.Errorf("%s:%s", errPrefix, err.Error())
}
