package preview

import (
	"context"
	"fmt"
	"os"

	"github.com/mitchellh/mapstructure"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/porter-dev/porter/internal/integrations/preview"
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

type PushDriver struct {
	target      *preview.Target
	config      *preview.PushDriverConfig
	lookupTable *map[string]drivers.Driver
	output      map[string]interface{}
	apiClient   api.Client
	cliConfig   config.CLIConfig
}

// NewPushDriver extends switchboard with image pushing to registries
func NewPushDriver(ctx context.Context, apiClient api.Client, cliConfig config.CLIConfig) func(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	return func(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
		driver := &PushDriver{
			lookupTable: opts.DriverLookupTable,
			output:      make(map[string]interface{}),
			apiClient:   apiClient,
			cliConfig:   cliConfig,
		}

		target, err := GetTarget(ctx, resource.Name, resource.Target, apiClient, cliConfig)
		if err != nil {
			return nil, err
		}

		driver.target = target

		return driver, nil
	}
}

func (d *PushDriver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *PushDriver) Apply(resource *models.Resource) (*models.Resource, error) {
	ctx := context.TODO() // switchboard blocks changing this for now

	pushDriverConfig, err := d.getConfig(resource)
	if err != nil {
		return nil, err
	}

	d.config = pushDriverConfig

	if d.config.Push.UsePackCache {
		d.output["image"] = d.config.Push.Image

		return resource, nil
	}

	agent, err := docker.NewAgentWithAuthGetter(ctx, d.apiClient, d.target.Project)
	if err != nil {
		return nil, err
	}

	_, err = d.apiClient.GetRelease(
		ctx,
		d.target.Project,
		d.target.Cluster,
		d.target.Namespace,
		d.target.AppName,
	)

	shouldCreate := err != nil

	if shouldCreate {
		regList, err := d.apiClient.ListRegistries(ctx, d.target.Project)
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
				repoSuffix = utils.SlugifyRepoSuffix(repoOwner, repoName)
			}
		}

		sharedOpts := &deploy.SharedOpts{
			ProjectID: d.target.Project,
			ClusterID: d.target.Cluster,
			Namespace: d.target.Namespace,
		}

		createAgent := &deploy.CreateAgent{
			Client: d.apiClient,
			CreateOpts: &deploy.CreateOpts{
				SharedOpts:  sharedOpts,
				ReleaseName: d.target.AppName,
				RegistryURL: registryURL,
				RepoSuffix:  repoSuffix,
			},
		}

		regID, imageURL, err := createAgent.GetImageRepoURL(ctx, d.target.AppName, sharedOpts.Namespace)
		if err != nil {
			return nil, err
		}

		err = d.apiClient.CreateRepository(
			ctx,
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

	err = agent.PushImage(ctx, d.config.Push.Image)
	if err != nil {
		return nil, err
	}

	d.output["image"] = d.config.Push.Image

	return resource, nil
}

func (d *PushDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}

func (d *PushDriver) getConfig(resource *models.Resource) (*preview.PushDriverConfig, error) {
	populatedConf, err := drivers.ConstructConfig(&drivers.ConstructConfigOpts{
		RawConf:      resource.Config,
		LookupTable:  *d.lookupTable,
		Dependencies: resource.Dependencies,
	})
	if err != nil {
		return nil, err
	}

	config := &preview.PushDriverConfig{}

	err = mapstructure.Decode(populatedConf, config)

	if err != nil {
		return nil, err
	}

	return config, nil
}
