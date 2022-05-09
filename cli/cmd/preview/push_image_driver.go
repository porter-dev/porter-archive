package preview

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

type PushDriverConfig struct {
	Push struct {
		UsePackCache bool `mapstructure:"use_pack_cache"`
		Image        string
	}
}

type PushDriver struct {
	target      *Target
	config      *PushDriverConfig
	lookupTable *map[string]drivers.Driver
	output      map[string]interface{}
}

func NewPushDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	driver := &PushDriver{
		lookupTable: opts.DriverLookupTable,
		output:      make(map[string]interface{}),
	}

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

func (d *PushDriver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *PushDriver) Apply(resource *models.Resource) (*models.Resource, error) {
	pushDriverConfig, err := d.getConfig(resource)
	if err != nil {
		return nil, err
	}

	d.config = pushDriverConfig

	if d.config.Push.UsePackCache {
		d.output["image"] = d.config.Push.Image

		return resource, nil
	}

	client := config.GetAPIClient()

	agent, err := docker.NewAgentWithAuthGetter(client, d.target.Project)
	if err != nil {
		return nil, err
	}

	_, err = client.GetRelease(
		context.Background(),
		d.target.Project,
		d.target.Cluster,
		d.target.Namespace,
		d.target.AppName,
	)

	shouldCreate := err != nil

	if shouldCreate {
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

		sharedOpts := &deploy.SharedOpts{
			ProjectID: d.target.Project,
			ClusterID: d.target.Cluster,
			Namespace: d.target.Namespace,
		}

		createAgent := &deploy.CreateAgent{
			Client: client,
			CreateOpts: &deploy.CreateOpts{
				SharedOpts:  sharedOpts,
				ReleaseName: d.target.AppName,
				RegistryURL: registryURL,
				RepoSuffix:  repoSuffix,
			},
		}

		regID, imageURL, err := createAgent.GetImageRepoURL(d.target.AppName, sharedOpts.Namespace)

		if err != nil {
			return nil, err
		}

		err = client.CreateRepository(
			context.Background(),
			sharedOpts.ProjectID,
			regID,
			&types.CreateRegistryRepositoryRequest{
				ImageRepoURI: imageURL,
			},
		)

		if err != nil {
			return nil, err
		}
	}

	err = agent.PushImage(d.config.Push.Image)
	if err != nil {
		return nil, err
	}

	d.output["image"] = d.config.Push.Image

	return resource, nil
}

func (d *PushDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}

func (d *PushDriver) getConfig(resource *models.Resource) (*PushDriverConfig, error) {
	populatedConf, err := drivers.ConstructConfig(&drivers.ConstructConfigOpts{
		RawConf:      resource.Config,
		LookupTable:  *d.lookupTable,
		Dependencies: resource.Dependencies,
	})

	if err != nil {
		return nil, err
	}

	config := &PushDriverConfig{}

	err = mapstructure.Decode(populatedConf, config)

	if err != nil {
		return nil, err
	}

	return config, nil
}
