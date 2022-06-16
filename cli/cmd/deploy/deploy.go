package deploy

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/porter/cli/cmd/github"
	"github.com/porter-dev/porter/internal/templater/utils"
	"k8s.io/client-go/util/homedir"
)

// DeployBuildType is the option to use as a builder
type DeployBuildType string

const (
	// uses local Docker daemon to build and push images
	DeployBuildTypeDocker DeployBuildType = "docker"

	// uses cloud-native build pack to build and push images
	DeployBuildTypePack DeployBuildType = "pack"
)

// DeployAgent handles the deployment and redeployment of an application on Porter
type DeployAgent struct {
	App string

	Client         *client.Client
	Opts           *DeployOpts
	Release        *types.GetReleaseResponse
	agent          *docker.Agent
	tag            string
	envPrefix      string
	env            map[string]string
	imageExists    bool
	imageRepo      string
	dockerfilePath string
}

// DeployOpts are the options for creating a new DeployAgent
type DeployOpts struct {
	*SharedOpts

	Local bool
}

// NewDeployAgent creates a new DeployAgent given a Porter API client, application
// name, and DeployOpts.
func NewDeployAgent(client *client.Client, app string, opts *DeployOpts) (*DeployAgent, error) {
	deployAgent := &DeployAgent{
		App:    app,
		Opts:   opts,
		Client: client,
		env:    make(map[string]string),
	}

	// get release from Porter API
	release, err := client.GetRelease(context.TODO(), opts.ProjectID, opts.ClusterID, opts.Namespace, app)

	if err != nil {
		return nil, err
	}

	deployAgent.Release = release

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

	// if build method is not set, determine based on release config
	if opts.Method == "" {
		if release.GitActionConfig != nil {
			// if the git action config exists, and dockerfile path is not empty, build type
			// is docker
			if release.GitActionConfig.DockerfilePath != "" {
				deployAgent.Opts.Method = DeployBuildTypeDocker
			} else {
				// otherwise build type is pack
				deployAgent.Opts.Method = DeployBuildTypePack
			}
		} else {
			// if the git action config does not exist, we use docker by default
			deployAgent.Opts.Method = DeployBuildTypeDocker
		}
	}

	if deployAgent.Opts.Method == DeployBuildTypeDocker {
		if release.GitActionConfig != nil {
			deployAgent.dockerfilePath = release.GitActionConfig.DockerfilePath
		}

		if deployAgent.Opts.LocalDockerfile != "" {
			deployAgent.dockerfilePath = deployAgent.Opts.LocalDockerfile
		}

		if deployAgent.dockerfilePath == "" && deployAgent.Opts.LocalDockerfile == "" {
			deployAgent.dockerfilePath = "./Dockerfile"
		}
	}

	// if the git action config is not set, we use local builds since pulling remote source
	// will fail. we set the image based on the git action config or the image written in the
	// helm values
	if release.GitActionConfig == nil {
		deployAgent.Opts.Local = true

		imageRepo, err := deployAgent.getReleaseImage()

		if err != nil {
			return nil, err
		}

		deployAgent.imageRepo = imageRepo

		deployAgent.dockerfilePath = deployAgent.Opts.LocalDockerfile
	} else {
		deployAgent.imageRepo = release.GitActionConfig.ImageRepoURI
		deployAgent.Opts.LocalPath = release.GitActionConfig.FolderPath
	}

	deployAgent.tag = opts.OverrideTag

	err = coalesceEnvGroups(deployAgent.Client, deployAgent.Opts.ProjectID, deployAgent.Opts.ClusterID,
		deployAgent.Opts.Namespace, deployAgent.Opts.EnvGroups, deployAgent.Release.Config)

	deployAgent.imageExists = deployAgent.agent.CheckIfImageExists(deployAgent.imageRepo, deployAgent.tag)

	return deployAgent, err
}

type GetBuildEnvOpts struct {
	UseNewConfig bool
	NewConfig    map[string]interface{}
}

// GetBuildEnv retrieves the build env from the release config and returns it.
//
// It returns a flattened map of all environment variables including:
//    1. container.env.normal from the release config
//    2. container.env.build from the release config
//    3. container.env.synced from the release config
//    4. any additional env var that was passed into the DeployAgent as opts.SharedOpts.AdditionalEnv
func (d *DeployAgent) GetBuildEnv(opts *GetBuildEnvOpts) (map[string]string, error) {
	conf := d.Release.Config

	if opts.UseNewConfig {
		if opts.NewConfig != nil {
			conf = utils.CoalesceValues(d.Release.Config, opts.NewConfig)
		}
	}

	env, err := GetEnvForRelease(d.Client, conf, d.Opts.ProjectID, d.Opts.ClusterID, d.Opts.Namespace)

	if err != nil {
		return nil, err
	}

	envConfig, err := GetNestedMap(conf, "container", "env")

	if err == nil {
		_, exists := envConfig["build"]

		if exists {
			buildEnv, err := GetNestedMap(conf, "container", "env", "build")

			if err == nil {
				for key, val := range buildEnv {
					if valStr, ok := val.(string); ok {
						env[key] = valStr
					}
				}
			}
		}
	}

	// add additional env based on options
	for key, val := range d.Opts.SharedOpts.AdditionalEnv {
		env[key] = val
	}

	return env, nil
}

// SetBuildEnv sets the build env vars in the process so that other commands can
// use them
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

// WriteBuildEnv writes the build env to either a file or stdout
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

// Build uses the deploy agent options to build a new container image from either
// buildpack or docker.
func (d *DeployAgent) Build(overrideBuildConfig *types.BuildConfig) error {
	// retrieve current image to use for cache
	currImageSection := d.Release.Config["image"].(map[string]interface{})
	currentTag := currImageSection["tag"].(string)

	if d.tag == "" {
		d.tag = currentTag
	}

	// if build is not local, fetch remote source
	var basePath string
	var err error

	buildCtx := d.Opts.LocalPath

	if !d.Opts.Local {
		repoSplit := strings.Split(d.Release.GitActionConfig.GitRepo, "/")

		if len(repoSplit) != 2 {
			return fmt.Errorf("invalid formatting of repo name")
		}

		zipResp, err := d.Client.GetRepoZIPDownloadURL(
			context.Background(),
			d.Opts.ProjectID,
			int64(d.Release.GitActionConfig.GitRepoID),
			"github",
			repoSplit[0],
			repoSplit[1],
			d.Release.GitActionConfig.GitBranch,
		)

		if err != nil {
			return err
		}

		// download the repository from remote source into a temp directory
		basePath, err = d.downloadRepoToDir(zipResp.URLString)

		if err != nil {
			return err
		}

		if d.tag == "" {
			shortRef := fmt.Sprintf("%.7s", zipResp.LatestCommitSHA)
			d.tag = shortRef
		}
	} else {
		basePath, err = filepath.Abs(".")

		if err != nil {
			return err
		}
	}

	currTag, err := d.pullCurrentReleaseImage()

	// if image is not found, don't return an error
	if err != nil && err != docker.PullImageErrNotFound {
		return err
	}

	buildAgent := &BuildAgent{
		SharedOpts:  d.Opts.SharedOpts,
		APIClient:   d.Client,
		ImageRepo:   d.imageRepo,
		Env:         d.env,
		ImageExists: d.imageExists,
	}

	if d.Opts.Method == DeployBuildTypeDocker {
		return buildAgent.BuildDocker(
			d.agent,
			basePath,
			buildCtx,
			d.dockerfilePath,
			d.tag,
			currentTag,
		)
	}

	buildConfig := d.Release.BuildConfig

	if overrideBuildConfig != nil {
		buildConfig = overrideBuildConfig
	}

	return buildAgent.BuildPack(d.agent, buildCtx, d.tag, currTag, buildConfig)
}

// Push pushes a local image to the remote repository linked in the release
func (d *DeployAgent) Push() error {
	return d.agent.PushImage(fmt.Sprintf("%s:%s", d.imageRepo, d.tag))
}

// UpdateImageAndValues updates the current image for a release, along with new
// configuration passed in via overrrideValues. If overrideValues is nil, it just
// reuses the configuration set for the application. If overrideValues is not nil,
// it will merge the overriding values with the existing configuration.
func (d *DeployAgent) UpdateImageAndValues(overrideValues map[string]interface{}) error {
	// we should fetch the latest release and its config
	release, err := d.Client.GetRelease(context.TODO(), d.Opts.ProjectID, d.Opts.ClusterID, d.Opts.Namespace, d.App)

	if err != nil {
		return err
	}

	d.Release = release

	// if this is a job chart, set "paused" to false so that the job doesn't run, unless
	// the user has explicitly overriden the "paused" field
	if _, exists := overrideValues["paused"]; d.Release.Chart.Name() == "job" && !exists {
		overrideValues["paused"] = true
	}

	mergedValues := utils.CoalesceValues(d.Release.Config, overrideValues)

	activeBlueGreenTagVal := GetCurrActiveBlueGreenImage(mergedValues)

	// only overwrite if the active tag value is not the same as the target tag. otherwise
	// this has been modified already and inserted into overrideValues.
	if activeBlueGreenTagVal != "" && activeBlueGreenTagVal != d.tag {
		mergedValues["bluegreen"] = map[string]interface{}{
			"enabled":                  true,
			"disablePrimaryDeployment": true,
			"activeImageTag":           activeBlueGreenTagVal,
			"imageTags":                []string{activeBlueGreenTagVal, d.tag},
		}
	}

	// overwrite the tag based on a new image
	currImageSection := mergedValues["image"].(map[string]interface{})

	// if the current image section is hello-porter, the image must be overriden
	if currImageSection["repository"] == "public.ecr.aws/o1j4x7p4/hello-porter" ||
		currImageSection["repository"] == "public.ecr.aws/o1j4x7p4/hello-porter-job" {
		newImage, err := d.getReleaseImage()

		if err != nil {
			return fmt.Errorf("could not overwrite hello-porter image: %s", err.Error())
		}

		currImageSection["repository"] = newImage

		// set to latest just to be safe -- this will be overriden if "d.tag" is set in
		// the agent
		currImageSection["tag"] = "latest"
	}

	if d.tag != "" && currImageSection["tag"] != d.tag {
		currImageSection["tag"] = d.tag
	}

	bytes, err := json.Marshal(mergedValues)

	if err != nil {
		return err
	}

	return d.Client.UpgradeRelease(
		context.Background(),
		d.Opts.ProjectID,
		d.Opts.ClusterID,
		d.Release.Namespace,
		d.Release.Name,
		&types.UpgradeReleaseRequest{
			Values: string(bytes),
		},
	)
}

type SyncedEnvSection struct {
	Name    string                `json:"name" yaml:"name"`
	Version uint                  `json:"version" yaml:"version"`
	Keys    []SyncedEnvSectionKey `json:"keys" yaml:"keys"`
}

type SyncedEnvSectionKey struct {
	Name   string `json:"name" yaml:"name"`
	Secret bool   `json:"secret" yaml:"secret"`
}

// GetEnvForRelease gets the env vars for a standard Porter template config. These env
// vars are found at `container.env.normal` and `container.env.synced`.
func GetEnvForRelease(
	client *client.Client,
	config map[string]interface{},
	projID, clusterID uint,
	namespace string,
) (map[string]string, error) {
	res := make(map[string]string)

	// first, get the env vars from "container.env.normal"
	normalEnv, err := GetNormalEnv(client, config, projID, clusterID, namespace, true)

	if err != nil {
		return nil, fmt.Errorf("error while fetching container.env.normal variables: %w", err)
	}

	for k, v := range normalEnv {
		res[k] = v
	}

	// next, get the env vars specified by "container.env.synced"
	// look for container.env.synced
	syncedEnv, err := GetSyncedEnv(client, config, projID, clusterID, namespace, true)

	if err != nil {
		return nil, fmt.Errorf("error while fetching container.env.synced variables: %w", err)
	}

	for k, v := range syncedEnv {
		res[k] = v
	}

	return res, nil
}

func GetNormalEnv(
	client *client.Client,
	config map[string]interface{},
	projID, clusterID uint,
	namespace string,
	buildTime bool,
) (map[string]string, error) {
	res := make(map[string]string)

	envConfig, err := GetNestedMap(config, "container", "env", "normal")

	// if the field is not found, set envConfig to an empty map; this release has no env set
	if err != nil {
		envConfig = make(map[string]interface{})
	}

	for key, val := range envConfig {
		valStr, ok := val.(string)

		if !ok {
			return nil, fmt.Errorf("could not cast environment variables to object")
		}

		// if the value contains PORTERSECRET, this is a "dummy" env that gets injected during
		// run-time, so we ignore it
		if buildTime && strings.Contains(valStr, "PORTERSECRET") {
			continue
		} else {
			res[key] = valStr
		}
	}

	return res, nil
}

func GetSyncedEnv(
	client *client.Client,
	config map[string]interface{},
	projID, clusterID uint,
	namespace string,
	buildTime bool,
) (map[string]string, error) {
	res := make(map[string]string)

	envConf, err := GetNestedMap(config, "container", "env")

	// if error, just return the env detected from above
	if err != nil {
		return res, nil
	}

	syncedEnvInter, syncedEnvExists := envConf["synced"]

	if !syncedEnvExists {
		return res, nil
	} else {
		syncedArr := make([]*SyncedEnvSection, 0)
		syncedArrInter, ok := syncedEnvInter.([]interface{})

		if !ok {
			return nil, fmt.Errorf("could not convert to synced env section: not an array")
		}

		for _, syncedArrInterObj := range syncedArrInter {
			syncedArrObj := &SyncedEnvSection{}
			syncedArrInterObjMap, ok := syncedArrInterObj.(map[string]interface{})

			if !ok {
				continue
			}

			if nameField, nameFieldExists := syncedArrInterObjMap["name"]; nameFieldExists {
				syncedArrObj.Name, ok = nameField.(string)

				if !ok {
					continue
				}
			}

			if versionField, versionFieldExists := syncedArrInterObjMap["version"]; versionFieldExists {
				versionFloat, ok := versionField.(float64)

				if !ok {
					continue
				}

				syncedArrObj.Version = uint(versionFloat)
			}

			if keyField, keyFieldExists := syncedArrInterObjMap["keys"]; keyFieldExists {
				keyFieldInterArr, ok := keyField.([]interface{})

				if !ok {
					continue
				}

				keyFieldMapArr := make([]map[string]interface{}, 0)

				for _, keyFieldInter := range keyFieldInterArr {
					mapConv, ok := keyFieldInter.(map[string]interface{})

					if !ok {
						continue
					}

					keyFieldMapArr = append(keyFieldMapArr, mapConv)
				}

				keyFieldRes := make([]SyncedEnvSectionKey, 0)

				for _, keyFieldMap := range keyFieldMapArr {
					toAdd := SyncedEnvSectionKey{}

					if nameField, nameFieldExists := keyFieldMap["name"]; nameFieldExists {
						toAdd.Name, ok = nameField.(string)

						if !ok {
							continue
						}
					}

					if secretField, secretFieldExists := keyFieldMap["secret"]; secretFieldExists {
						toAdd.Secret, ok = secretField.(bool)

						if !ok {
							continue
						}
					}

					keyFieldRes = append(keyFieldRes, toAdd)
				}

				syncedArrObj.Keys = keyFieldRes
			}

			syncedArr = append(syncedArr, syncedArrObj)
		}

		for _, syncedEG := range syncedArr {
			// for each synced environment group, get the environment group from the client
			eg, err := client.GetEnvGroup(context.Background(), projID, clusterID, namespace,
				&types.GetEnvGroupRequest{
					Name: syncedEG.Name,
				},
			)

			if err != nil {
				continue
			}

			for key, val := range eg.Variables {
				if buildTime && strings.Contains(val, "PORTERSECRET") {
					continue
				} else {
					res[key] = val
				}
			}
		}
	}

	return res, nil
}

func (d *DeployAgent) getReleaseImage() (string, error) {
	if d.Release.ImageRepoURI != "" {
		return d.Release.ImageRepoURI, nil
	}

	// get the image from the conig
	imageConfig, err := GetNestedMap(d.Release.Config, "image")

	if err != nil {
		return "", fmt.Errorf("could not get image config from release: %s", err.Error())
	}

	repoInterface, ok := imageConfig["repository"]

	if !ok {
		return "", fmt.Errorf("repository field does not exist for image")
	}

	repoStr, ok := repoInterface.(string)

	if !ok {
		return "", fmt.Errorf("could not cast image.image field to string")
	}

	return repoStr, nil
}

func (d *DeployAgent) pullCurrentReleaseImage() (string, error) {
	// pull the currently deployed image to use cache, if possible
	imageConfig, err := GetNestedMap(d.Release.Config, "image")

	if err != nil {
		return "", fmt.Errorf("could not get image config from release: %s", err.Error())
	}

	tagInterface, ok := imageConfig["tag"]

	if !ok {
		return "", fmt.Errorf("tag field does not exist for image")
	}

	tagStr, ok := tagInterface.(string)

	if !ok {
		return "", fmt.Errorf("could not cast image.tag field to string")
	}

	// if image repo is a hello-porter image, skip
	if d.imageRepo == "public.ecr.aws/o1j4x7p4/hello-porter" ||
		d.imageRepo == "public.ecr.aws/o1j4x7p4/hello-porter-job" {
		return "", nil
	}

	fmt.Printf("attempting to pull image: %s\n", fmt.Sprintf("%s:%s", d.imageRepo, tagStr))

	return tagStr, d.agent.PullImage(fmt.Sprintf("%s:%s", d.imageRepo, tagStr))
}

func (d *DeployAgent) downloadRepoToDir(downloadURL string) (string, error) {
	dstDir := filepath.Join(homedir.HomeDir(), ".porter")

	downloader := &github.ZIPDownloader{
		ZipFolderDest:       dstDir,
		AssetFolderDest:     dstDir,
		ZipName:             fmt.Sprintf("%s.zip", strings.Replace(d.Release.GitActionConfig.GitRepo, "/", "-", 1)),
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
		if info.Mode().IsDir() && strings.Contains(info.Name(), strings.Replace(d.Release.GitActionConfig.GitRepo, "/", "-", 1)) {
			res = filepath.Join(dstDir, info.Name())
		}
	}

	if res == "" {
		return "", fmt.Errorf("unzipped file not found on host")
	}

	return res, nil
}

func (d *DeployAgent) StreamEvent(event types.SubEvent) error {
	return d.Client.CreateEvent(
		context.Background(),
		d.Opts.ProjectID, d.Opts.ClusterID,
		d.Release.Namespace, d.Release.Name,
		&types.UpdateReleaseStepsRequest{
			Event: event,
		},
	)
}

type NestedMapFieldNotFoundError struct {
	Field string
}

func (e *NestedMapFieldNotFoundError) Error() string {
	return fmt.Sprintf("could not find field %s in configuration", e.Field)
}

func GetNestedMap(obj map[string]interface{}, fields ...string) (map[string]interface{}, error) {
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

func GetCurrActiveBlueGreenImage(vals map[string]interface{}) string {
	if bgInter, ok := vals["bluegreen"]; ok {
		if bgVal, ok := bgInter.(map[string]interface{}); ok {
			if enabledInter, ok := bgVal["enabled"]; ok {
				if enabledVal, ok := enabledInter.(bool); ok && enabledVal {
					// they're enabled -- read the activeTagValue and construct the new bluegreen object
					if activeTagInter, ok := bgVal["activeImageTag"]; ok {
						if activeTagVal, ok := activeTagInter.(string); ok {
							return activeTagVal
						}
					}
				}
			}
		}
	}

	return ""
}
