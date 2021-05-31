package deploy

import (
	"context"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/porter/cli/cmd/github"
	"github.com/porter-dev/porter/cli/cmd/pack"
	"k8s.io/client-go/util/homedir"
)

// deployBuildType is the option to use as a builder
type deployBuildType string

const (
	// uses local Docker daemon to build and push images
	deployBuildTypeDocker deployBuildType = "docker"

	// uses cloud-native build pack to build and push images
	deployBuildTypePack deployBuildType = "pack"
)

// DeployAgent handles the deployment and redeployment of an application on Porter
type DeployAgent struct {
	App string

	buildType   deployBuildType
	client      *api.Client
	release     *api.GetReleaseResponse
	agent       *docker.Agent
	opts        *DeployOpts
	tag         string
	envPrefix   string
	env         map[string]string
	imageExists bool
}

// DeployOpts are the options for creating a new DeployAgent
type DeployOpts struct {
	ProjectID   uint
	ClusterID   uint
	Namespace   string
	Local       bool
	LocalPath   string
	OverrideTag string
}

var ErrNoGitActionConfig error = fmt.Errorf("specified release does not have a git action config")

// NewDeployAgent creates a new DeployAgent given a Porter API client, application
// name, and DeployOpts.
func NewDeployAgent(client *api.Client, app string, opts *DeployOpts) (*DeployAgent, error) {
	deployAgent := &DeployAgent{
		App:    app,
		opts:   opts,
		client: client,
		env:    make(map[string]string),
	}

	// get release from Porter API
	release, err := client.GetRelease(context.TODO(), opts.ProjectID, opts.ClusterID, opts.Namespace, app)

	if err != nil {
		return nil, err
	}

	// if the git action config is nil, return an error
	if release.GitActionConfig == nil {
		return nil, ErrNoGitActionConfig
	}

	deployAgent.release = release

	// set an environment prefix to avoid collisions
	deployAgent.envPrefix = fmt.Sprintf("PORTER_%s", strings.Replace(
		strings.ToUpper(app), "-", "_", -1,
	))

	// get docker agent
	agent, err := docker.NewAgentWithAuthGetter(client, opts.ProjectID)

	if err != nil {
		return nil, err
	}

	deployAgent.agent = agent

	if release.GitActionConfig.DockerfilePath != "" {
		deployAgent.buildType = deployBuildTypeDocker
	} else {
		deployAgent.buildType = deployBuildTypePack
	}

	deployAgent.tag = opts.OverrideTag

	return deployAgent, nil
}

func (d *DeployAgent) GetBuildEnv() (map[string]string, error) {
	return d.getEnvFromRelease()
}

func (d *DeployAgent) SetBuildEnv(envVars map[string]string) error {
	d.env = envVars

	// iterate through env and set the environment variables for the process
	// these are prefixed with PORTER_<RELEASE> to avoid collisions. We use
	// these prefixed env when calling a custom build command as a child process.
	for key, val := range envVars {
		prefixedKey := fmt.Sprintf("%s_%s", d.envPrefix, key)

		err := os.Setenv(prefixedKey, val)

		if err != nil {
			return err
		}
	}

	return nil
}

func (d *DeployAgent) WriteBuildEnv(fileDest string) error {
	// join lines together
	lines := make([]string, 0)

	// use os.Environ to get output already formatted as KEY=value
	for _, line := range os.Environ() {
		// filter for PORTER_<RELEASE> and strip prefix
		if strings.Contains(line, d.envPrefix+"_") {
			lines = append(lines, strings.Split(line, d.envPrefix+"_")[1])
		}
	}

	output := strings.Join(lines, "\n")

	if fileDest != "" {
		ioutil.WriteFile(fileDest, []byte(output), 0700)
	} else {
		fmt.Println(output)
	}

	return nil
}

func (d *DeployAgent) Build() error {
	// if build is not local, fetch remote source
	var dst string
	var err error

	if !d.opts.Local {
		zipResp, err := d.client.GetRepoZIPDownloadURL(
			context.Background(),
			d.opts.ProjectID,
			d.release.GitActionConfig,
		)

		if err != nil {
			return err
		}

		// download the repository from remote source into a temp directory
		dst, err = d.downloadRepoToDir(zipResp.URLString)

		if d.tag == "" {
			shortRef := fmt.Sprintf("%.7s", zipResp.LatestCommitSHA)
			d.tag = shortRef
		}

		if err != nil {
			return err
		}
	} else {
		dst = filepath.Dir(d.opts.LocalPath)
	}

	if d.tag == "" {
		d.tag = "latest"
	}

	err = d.pullCurrentReleaseImage()

	// if image is not found, don't return an error
	if err != nil && err != docker.PullImageErrNotFound {
		return err
	} else if err != nil && err == docker.PullImageErrNotFound {
		fmt.Println("could not find image, moving to build step")
		d.imageExists = false
	}

	if d.buildType == deployBuildTypeDocker {
		return d.BuildDocker(dst, d.tag)
	}

	return d.BuildPack(dst, d.tag)
}

func (d *DeployAgent) BuildDocker(dst, tag string) error {
	opts := &docker.BuildOpts{
		ImageRepo:    d.release.GitActionConfig.ImageRepoURI,
		Tag:          tag,
		BuildContext: dst,
		Env:          d.env,
	}

	return d.agent.BuildLocal(
		opts,
		d.release.GitActionConfig.DockerfilePath,
	)
}

func (d *DeployAgent) BuildPack(dst, tag string) error {
	// retag the image with "pack-cache" tag so that it doesn't re-pull from the registry
	if d.imageExists {
		err := d.agent.TagImage(
			fmt.Sprintf("%s:%s", d.release.GitActionConfig.ImageRepoURI, tag),
			fmt.Sprintf("%s:%s", d.release.GitActionConfig.ImageRepoURI, "pack-cache"),
		)

		if err != nil {
			return err
		}
	}

	// create pack agent and build opts
	packAgent := &pack.Agent{}

	opts := &docker.BuildOpts{
		ImageRepo: d.release.GitActionConfig.ImageRepoURI,
		// We tag the image with a stable param "pack-cache" so that pack can use the
		// local image without attempting to re-pull from registry. We handle getting
		// registry credentials and pushing/pulling the image.
		Tag:          "pack-cache",
		BuildContext: dst,
		Env:          d.env,
	}

	// call builder
	err := packAgent.Build(opts)

	if err != nil {
		return err
	}

	return d.agent.TagImage(
		fmt.Sprintf("%s:%s", d.release.GitActionConfig.ImageRepoURI, "pack-cache"),
		fmt.Sprintf("%s:%s", d.release.GitActionConfig.ImageRepoURI, tag),
	)
}

func (d *DeployAgent) Deploy() error {
	// push the created image
	err := d.agent.PushImage(fmt.Sprintf("%s:%s", d.release.GitActionConfig.ImageRepoURI, d.tag))

	if err != nil {
		return err
	}

	releaseExt, err := d.client.GetReleaseWebhook(
		context.Background(),
		d.opts.ProjectID,
		d.opts.ClusterID,
		d.release.Name,
		d.release.Namespace,
	)

	if err != nil {
		return err
	}

	return d.client.DeployWithWebhook(
		context.Background(),
		releaseExt.WebhookToken,
		d.tag,
	)
}

// HELPER METHODS
func (d *DeployAgent) getEnvFromRelease() (map[string]string, error) {
	envConfig, err := getNestedMap(d.release.Config, "container", "env", "normal")

	// if the field is not found, set envConfig to an empty map; this release has no env set
	if e := (&NestedMapFieldNotFoundError{}); errors.As(err, &e) {
		envConfig = make(map[string]interface{})
	} else if err != nil {
		return nil, fmt.Errorf("could not get environment variables from release: %s", err.Error())
	}

	mapEnvConfig := make(map[string]string)

	for key, val := range envConfig {
		valStr, ok := val.(string)

		if !ok {
			return nil, fmt.Errorf("could not cast environment variables to object")
		}

		// if the value contains PORTERSECRET, this is a "dummy" env that gets injected during
		// run-time, so we ignore it
		if !strings.Contains(valStr, "PORTERSECRET") {
			mapEnvConfig[key] = valStr
		}
	}

	return mapEnvConfig, nil
}

type NestedMapFieldNotFoundError struct {
	Field string
}

func (e *NestedMapFieldNotFoundError) Error() string {
	return fmt.Sprintf("could not find field %s in configuration", e.Field)
}

func getNestedMap(obj map[string]interface{}, fields ...string) (map[string]interface{}, error) {
	var res map[string]interface{}
	curr := obj

	for _, field := range fields {
		objField, ok := curr[field]

		if !ok {
			return nil, &NestedMapFieldNotFoundError{field}
		}

		res, ok = objField.(map[string]interface{})

		if !ok {
			return nil, fmt.Errorf("%s is not a nested object", field)
		}

		curr = res
	}

	return res, nil
}

func (d *DeployAgent) pullCurrentReleaseImage() error {
	// pull the currently deployed image to use cache, if possible
	imageConfig, err := getNestedMap(d.release.Config, "image")

	if err != nil {
		return fmt.Errorf("could not get image config from release: %s", err.Error())
	}

	tagInterface, ok := imageConfig["tag"]

	if !ok {
		return fmt.Errorf("tag field does not exist for image")
	}

	tagStr, ok := tagInterface.(string)

	if !ok {
		return fmt.Errorf("could not cast image.tag field to string")
	}

	fmt.Printf("attempting to pull image: %s\n", fmt.Sprintf("%s:%s", d.release.GitActionConfig.ImageRepoURI, tagStr))

	return d.agent.PullImage(fmt.Sprintf("%s:%s", d.release.GitActionConfig.ImageRepoURI, tagStr))
}

func (d *DeployAgent) downloadRepoToDir(downloadURL string) (string, error) {
	dstDir := filepath.Join(homedir.HomeDir(), ".porter")

	downloader := &github.ZIPDownloader{
		ZipFolderDest:       dstDir,
		AssetFolderDest:     dstDir,
		ZipName:             fmt.Sprintf("%s.zip", strings.Replace(d.release.GitActionConfig.GitRepo, "/", "-", 1)),
		RemoveAfterDownload: true,
	}

	err := downloader.DownloadToFile(downloadURL)

	if err != nil {
		return "", fmt.Errorf("Error downloading to file: %s", err.Error())
	}

	err = downloader.UnzipToDir()

	if err != nil {
		return "", fmt.Errorf("Error unzipping to directory: %s", err.Error())
	}

	var res string

	dstFiles, err := ioutil.ReadDir(dstDir)

	for _, info := range dstFiles {
		if info.Mode().IsDir() && strings.Contains(info.Name(), strings.Replace(d.release.GitActionConfig.GitRepo, "/", "-", 1)) {
			res = filepath.Join(dstDir, info.Name())
		}
	}

	if res == "" {
		return "", fmt.Errorf("unzipped file not found on host")
	}

	return res, nil
}
