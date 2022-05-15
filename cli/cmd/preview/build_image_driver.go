package preview

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/cli/cli/git"
	"github.com/docker/distribution/reference"
	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

type BuildDriverConfig struct {
	Build struct {
		UsePackCache bool `mapstructure:"use_pack_cache"`
		Method       string
		Context      string
		Dockerfile   string
		Builder      string
		Buildpacks   []string
		Image        string
		Env          map[string]string
	}

	EnvGroups []types.EnvGroupMeta `mapstructure:"env_groups"`

	Values map[string]interface{}
}

type BuildDriver struct {
	source      *Source
	target      *Target
	config      *BuildDriverConfig
	lookupTable *map[string]drivers.Driver
	output      map[string]interface{}
}

func NewBuildDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	driver := &BuildDriver{
		lookupTable: opts.DriverLookupTable,
		output:      make(map[string]interface{}),
	}

	source, err := GetSource(resource.Source)
	if err != nil {
		return nil, err
	}

	driver.source = source

	target, err := GetTarget(resource.Target)
	if err != nil {
		return nil, err
	}

	if target.AppName == "" {
		return nil, fmt.Errorf("target app_name is missing")
	}

	driver.target = target

	return driver, nil
}

func (d *BuildDriver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *BuildDriver) Apply(resource *models.Resource) (*models.Resource, error) {
	buildDriverConfig, err := d.getConfig(resource)
	if err != nil {
		return nil, err
	}

	d.config = buildDriverConfig

	client := config.GetAPIClient()

	// FIXME: give tag option in config build, but override if PORTER_TAG is present
	tag := os.Getenv("PORTER_TAG")

	if tag == "" {
		commit, err := git.LastCommit()

		if err != nil {
			return nil, err
		}

		tag = commit.Sha[:7]
	}

	// if the method is registry and a tag is defined, we use the provided tag
	if d.config.Build.Method == "registry" {
		imageSpl := strings.Split(d.config.Build.Image, ":")

		if len(imageSpl) == 2 {
			tag = imageSpl[1]
		}

		if tag == "" {
			tag = "latest"
		}
	}

	regList, err := client.ListRegistries(context.Background(), d.target.Project)

	if err != nil {
		return nil, err
	}

	var registryURL string

	if len(*regList) == 0 {
		return nil, fmt.Errorf("no registry found")
	} else {
		registryURL = (*regList)[0].URL
	}

	var repoSuffix string

	if repoName := os.Getenv("PORTER_REPO_NAME"); repoName != "" {
		if repoOwner := os.Getenv("PORTER_REPO_OWNER"); repoOwner != "" {
			repoSuffix = strings.ToLower(strings.ReplaceAll(fmt.Sprintf("%s-%s", repoOwner, repoName), "_", "-"))
		}
	}

	createAgent := &deploy.CreateAgent{
		Client: client,
		CreateOpts: &deploy.CreateOpts{
			SharedOpts: &deploy.SharedOpts{
				ProjectID:       d.target.Project,
				ClusterID:       d.target.Cluster,
				OverrideTag:     tag,
				Namespace:       d.target.Namespace,
				LocalPath:       d.config.Build.Context,
				LocalDockerfile: d.config.Build.Dockerfile,
				Method:          deploy.DeployBuildType(d.config.Build.Method),
				EnvGroups:       d.config.EnvGroups,
				UseCache:        d.config.Build.UsePackCache,
			},
			Kind:        d.source.Name,
			ReleaseName: d.target.AppName,
			RegistryURL: registryURL,
			RepoSuffix:  repoSuffix,
		},
	}

	regID, imageURL, err := createAgent.GetImageRepoURL(d.target.AppName, d.target.Namespace)
	if err != nil {
		return nil, err
	}

	if d.config.Build.UsePackCache {
		err := config.SetDockerConfig(client)

		if err != nil {
			return nil, err
		}

		if d.config.Build.Method == "pack" {
			repoResp, err := client.ListRegistryRepositories(context.Background(), d.target.Project, regID)

			if err != nil {
				return nil, err
			}

			repos := *repoResp

			found := false

			for _, repo := range repos {
				if repo.URI == imageURL {
					found = true
					break
				}
			}

			if !found {
				err = client.CreateRepository(
					context.Background(),
					d.target.Project,
					regID,
					&types.CreateRegistryRepositoryRequest{
						ImageRepoURI: imageURL,
					},
				)

				if err != nil {
					return nil, err
				}
			}
		}
	}

	if d.config.Build.Method != "" {
		if d.config.Build.Method == string(deploy.DeployBuildTypeDocker) {
			if d.config.Build.Dockerfile == "" {
				hasDockerfile := createAgent.HasDefaultDockerfile(d.config.Build.Context)

				if !hasDockerfile {
					return nil, fmt.Errorf("dockerfile not found")
				}

				d.config.Build.Dockerfile = "Dockerfile"
			}
		}
	} else {
		// try to detect dockerfile, otherwise fall back to `pack`
		hasDockerfile := createAgent.HasDefaultDockerfile(d.config.Build.Context)

		if !hasDockerfile {
			d.config.Build.Method = string(deploy.DeployBuildTypePack)
		} else {
			d.config.Build.Method = string(deploy.DeployBuildTypeDocker)
			d.config.Build.Dockerfile = "Dockerfile"
		}
	}

	// create docker agent
	agent, err := docker.NewAgentWithAuthGetter(client, d.target.Project)

	if err != nil {
		return nil, err
	}

	_, mergedValues, err := createAgent.GetMergedValues(d.config.Values)

	if err != nil {
		return nil, err
	}

	env, err := deploy.GetEnvForRelease(
		client,
		mergedValues,
		d.target.Project,
		d.target.Cluster,
		d.target.Namespace,
	)

	if err != nil {
		env = make(map[string]string)
	}

	envConfig, err := deploy.GetNestedMap(mergedValues, "container", "env")

	if err == nil {
		_, exists := envConfig["build"]

		if exists {
			buildEnv, err := deploy.GetNestedMap(mergedValues, "container", "env", "build")

			if err == nil {
				for key, val := range buildEnv {
					if valStr, ok := val.(string); ok {
						env[key] = valStr
					}
				}
			}
		}
	}

	for k, v := range d.config.Build.Env {
		env[k] = v
	}

	buildAgent := &deploy.BuildAgent{
		SharedOpts:  createAgent.CreateOpts.SharedOpts,
		APIClient:   client,
		ImageRepo:   imageURL,
		Env:         env,
		ImageExists: false,
	}

	if d.config.Build.Method == string(deploy.DeployBuildTypeDocker) {
		basePath, err := filepath.Abs(".")

		if err != nil {
			return nil, err
		}

		err = buildAgent.BuildDocker(
			agent,
			basePath,
			d.config.Build.Context,
			d.config.Build.Dockerfile,
			tag,
			"",
		)
	} else {
		var buildConfig *types.BuildConfig

		if d.config.Build.Builder != "" {
			buildConfig = &types.BuildConfig{
				Builder:    d.config.Build.Builder,
				Buildpacks: d.config.Build.Buildpacks,
			}
		}

		err = buildAgent.BuildPack(
			agent,
			d.config.Build.Context,
			tag,
			"",
			buildConfig,
		)
	}

	if err != nil {
		return nil, err
	}

	named, _ := reference.ParseNamed(imageURL)
	domain := reference.Domain(named)
	imageRepo := reference.Path(named)

	d.output["registry_url"] = domain
	d.output["image_repo"] = imageRepo
	d.output["image_tag"] = tag
	d.output["image"] = fmt.Sprintf("%s:%s", imageURL, tag)

	return resource, nil
}

func (d *BuildDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}

func (d *BuildDriver) getConfig(resource *models.Resource) (*BuildDriverConfig, error) {
	populatedConf, err := drivers.ConstructConfig(&drivers.ConstructConfigOpts{
		RawConf:      resource.Config,
		LookupTable:  *d.lookupTable,
		Dependencies: resource.Dependencies,
	})

	if err != nil {
		return nil, err
	}

	config := &BuildDriverConfig{}

	err = mapstructure.Decode(populatedConf, config)

	if err != nil {
		return nil, err
	}

	return config, nil
}
