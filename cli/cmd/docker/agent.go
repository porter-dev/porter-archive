package docker

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/digitalocean/godo"
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
	*client.Client
	authGetter *AuthGetter
	ctx        context.Context
	label      string
}

// CreateLocalVolumeIfNotExist creates a volume using driver type "local" with the
// given name if it does not exist. If the volume does exist but does not contain
// the required label (a.label), an error is thrown.
func (a *Agent) CreateLocalVolumeIfNotExist(name string) (*types.Volume, error) {
	volListBody, err := a.VolumeList(a.ctx, filters.Args{})

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

	vol, err := a.VolumeCreate(a.ctx, opts)

	if err != nil {
		return nil, a.handleDockerClientErr(err, "Could not create volume "+name)
	}

	return &vol, nil
}

// RemoveLocalVolume removes a volume by name
func (a *Agent) RemoveLocalVolume(name string) error {
	return a.VolumeRemove(a.ctx, name, true)
}

// CreateBridgeNetworkIfNotExist creates a volume using driver type "local" with the
// given name if it does not exist. If the volume does exist but does not contain
// the required label (a.label), an error is thrown.
func (a *Agent) CreateBridgeNetworkIfNotExist(name string) (id string, err error) {
	networks, err := a.NetworkList(a.ctx, types.NetworkListOptions{})

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

	net, err := a.NetworkCreate(a.ctx, name, opts)

	if err != nil {
		return "", a.handleDockerClientErr(err, "Could not create network "+name)
	}

	return net.ID, nil
}

// ConnectContainerToNetwork attaches a container to a specified network
func (a *Agent) ConnectContainerToNetwork(networkID, containerID, containerName string) error {
	// check if the container is connected already
	net, err := a.NetworkInspect(a.ctx, networkID, types.NetworkInspectOptions{})

	if err != nil {
		return a.handleDockerClientErr(err, "Could not inspect network"+networkID)
	}

	for _, cont := range net.Containers {
		// if container is connected, just return
		if cont.Name == containerName {
			return nil
		}
	}

	return a.NetworkConnect(a.ctx, networkID, containerID, &network.EndpointSettings{})
}

func (a *Agent) TagImage(old, new string) error {
	return a.ImageTag(a.ctx, old, new)
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

func getRegistryRepositoryPair(imageRepo string) ([]string, error) {
	named, err := reference.ParseNamed(imageRepo)

	if err != nil {
		return nil, err
	}

	path := reference.Path(named)

	return strings.SplitN(path, "/", 2), nil
}

// CheckIfImageExists checks if the image exists in the registry
func (a *Agent) CheckIfImageExists(imageRepo, imageTag string) bool {
	registryToken, err := a.getContainerRegistryToken(imageRepo)

	if err != nil {
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	if strings.Contains(imageRepo, "gcr.io") {
		gcrRegRepo, err := getRegistryRepositoryPair(imageRepo)

		if err != nil {
			return false
		}

		named, err := reference.ParseNamed(imageRepo)

		if err != nil {
			return false
		}

		req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf(
			"https://%s/v2/%s/%s/tags/list", reference.Domain(named), gcrRegRepo[0], gcrRegRepo[1],
		), nil)

		if err != nil {
			return false
		}

		req.Header.Add("Content-Type", "application/json")
		req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", registryToken))

		resp, err := http.DefaultClient.Do(req)

		if err != nil {
			return false
		}

		defer resp.Body.Close()

		var tags struct {
			Tags []string `json:"tags,omitempty"`
		}

		err = json.NewDecoder(resp.Body).Decode(&tags)

		if err != nil {
			return false
		}

		for _, tag := range tags.Tags {
			if tag == imageTag {
				return true
			}
		}

		return false
	} else if strings.Contains(imageRepo, "registry.digitalocean.com") {
		doRegRepo, err := getRegistryRepositoryPair(imageRepo)

		if err != nil {
			return false
		}

		doClient := godo.NewFromToken(registryToken)

		manifests, _, err := doClient.Registry.ListRepositoryManifests(
			ctx, doRegRepo[0], doRegRepo[1], &godo.ListOptions{},
		)

		if err != nil {
			return false
		}

		for _, manifest := range manifests {
			for _, tag := range manifest.Tags {
				if tag == imageTag {
					return true
				}
			}
		}

		return false
	}

	image := imageRepo + ":" + imageTag
	encodedRegistryAuth, err := a.getEncodedRegistryAuth(image)

	if err != nil {
		return false
	}

	_, err = a.DistributionInspect(context.Background(), image, encodedRegistryAuth)

	if err == nil {
		return true
	} else if strings.Contains(err.Error(), "image not found") ||
		strings.Contains(err.Error(), "does not exist in the registry") {
		return false
	}

	return false
}

// PullImage pulls an image specified by the image string
func (a *Agent) PullImage(image string) error {
	opts, err := a.getPullOptions(image)

	if err != nil {
		return err
	}

	// pull the specified image
	out, err := a.ImagePull(a.ctx, image, opts)

	if err != nil {
		if client.IsErrNotFound(err) ||
			(strings.Contains(image, "gcr.io") && strings.Contains(err.Error(), "or it may not exist")) {
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
func (a *Agent) PushImage(image string) error {
	opts, err := a.getPushOptions(image)

	if err != nil {
		return err
	}

	out, err := a.ImagePush(
		context.Background(),
		image,
		opts,
	)

	if out != nil {
		defer out.Close()
	}

	if err != nil {
		return err
	}

	termFd, isTerm := term.GetFdInfo(os.Stderr)

	return jsonmessage.DisplayJSONMessagesStream(out, os.Stderr, termFd, isTerm, nil)
}

func (a *Agent) getPullOptions(image string) (types.ImagePullOptions, error) {
	// check if agent has an auth getter; otherwise, assume public usage
	if a.authGetter == nil {
		return types.ImagePullOptions{}, nil
	}

	authConfigEncoded, err := a.getEncodedRegistryAuth(image)

	if err != nil {
		return types.ImagePullOptions{}, err
	}

	return types.ImagePullOptions{
		RegistryAuth: authConfigEncoded,
		Platform:     "linux/amd64",
	}, nil
}

func (a *Agent) getContainerRegistryToken(image string) (string, error) {
	serverURL, err := GetServerURLFromTag(image)

	if err != nil {
		return "", err
	}

	_, secret, err := a.authGetter.GetCredentials(serverURL)

	if err != nil {
		return "", err
	}

	return secret, nil
}

func (a *Agent) getEncodedRegistryAuth(image string) (string, error) {
	// get using server url
	serverURL, err := GetServerURLFromTag(image)

	if err != nil {
		return "", err
	}

	user, secret, err := a.authGetter.GetCredentials(serverURL)

	if err != nil {
		return "", err
	}

	var authConfig = types.AuthConfig{
		Username:      user,
		Password:      secret,
		ServerAddress: "https://" + serverURL,
	}

	authConfigBytes, _ := json.Marshal(authConfig)

	return base64.URLEncoding.EncodeToString(authConfigBytes), nil
}

func (a *Agent) getPushOptions(image string) (types.ImagePushOptions, error) {
	pullOpts, err := a.getPullOptions(image)

	return types.ImagePushOptions(pullOpts), err
}

func GetServerURLFromTag(image string) (string, error) {
	named, err := reference.ParseNormalizedNamed(image)

	if err != nil {
		return "", err
	}

	domain := reference.Domain(named)

	if domain == "" {
		// if domain name is empty, use index.docker.io/v1
		return "index.docker.io/v1", nil
	} else if matches := ecrPattern.FindStringSubmatch(image); len(matches) >= 3 {
		// if this matches ECR, just use the domain name
		return domain, nil
	} else if strings.Contains(image, "gcr.io") || strings.Contains(image, "registry.digitalocean.com") {
		// if this matches GCR or DOCR, use the first path component
		return fmt.Sprintf("%s/%s", domain, strings.Split(reference.Path(named), "/")[0]), nil
	}

	// otherwise, best-guess is to get components of path that aren't the image name
	pathParts := strings.Split(reference.Path(named), "/")
	nonImagePath := ""

	if len(pathParts) > 1 {
		nonImagePath = strings.Join(pathParts[0:len(pathParts)-1], "/")
	}

	if err != nil {
		return "", err
	}

	if domain == "docker.io" {
		domain = "index.docker.io"
	}

	return fmt.Sprintf("%s/%s", domain, nonImagePath), nil
}

// WaitForContainerStop waits until a container has stopped to exit
func (a *Agent) WaitForContainerStop(id string) error {
	// wait for container to stop before exit
	statusCh, errCh := a.ContainerWait(a.ctx, id, container.WaitConditionNotRunning)

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
		cont, err := a.ContainerInspect(a.ctx, id)

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
		return fmt.Errorf("The Docker daemon must be running in order to start Porter: connection to %s failed", a.DaemonHost())
	}

	return fmt.Errorf("%s:%s", errPrefix, err.Error())
}
