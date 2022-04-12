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
		ForceBuild bool `mapstructure:"force_build"`
		UseCache   bool `mapstructure:"use_cache"`
		Method     string
		Context    string
		Dockerfile string
		Builder    string
		Buildpacks []string
		Image      string
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

	driver.target = target

	buildDriverConfig, err := driver.getConfig(resource)
	if err != nil {
		return nil, err
	}

	driver.config = buildDriverConfig

	return driver, nil
}

func (d *BuildDriver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *BuildDriver) Apply(resource *models.Resource) (*models.Resource, error) {
	client := config.GetAPIClient()

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
			repoSuffix = strings.ReplaceAll(fmt.Sprintf("%s-%s", repoOwner, repoName), "_", "-")
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
				UseCache:        d.config.Build.UseCache,
			},
			Kind:        d.source.Name,
			ReleaseName: d.target.AppName,
			RegistryURL: registryURL,
			RepoSuffix:  repoSuffix,
		},
	}

	_, imageURL, err := createAgent.GetImageRepoURL(d.target.AppName, d.target.Namespace)
	if err != nil {
		return nil, err
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

	imageExists := agent.CheckIfImageExists(imageURL, tag) // FIXME: does not seem to work with gcr.io images

	fmt.Printf("imageExists: %v\n", imageExists)
	fmt.Printf("force_build: %v\n", d.config.Build.ForceBuild)

	if imageExists && tag != "latest" && !d.config.Build.ForceBuild {
		fmt.Printf("%s:%s already exists in the registry, so skipping build\n", imageURL, tag)
	} else {
		_, mergedValues, err := createAgent.GetMergedValues(d.config.Values)

		if err != nil {
			return nil, err
		}

		fmt.Printf("mergedValues: %v\n", mergedValues)

		env, err := deploy.GetEnvForRelease(
			client,
			mergedValues,
			d.target.Project,
			d.target.Cluster,
			d.target.Namespace,
		)

		if err != nil {
			env = map[string]string{}
		}

		fmt.Printf("env: %v\n", env)

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
	}

	named, _ := reference.ParseNamed(imageURL)
	domain := reference.Domain(named)
	imageRepo := reference.Path(named)

	d.output["registry_url"] = domain
	d.output["image_repo"] = imageRepo
	d.output["image_tag"] = tag

	fmt.Println(d.output)

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
