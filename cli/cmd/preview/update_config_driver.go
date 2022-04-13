package preview

import (
	"context"
	"fmt"
	"os"

	"github.com/cli/cli/git"
	"github.com/fatih/color"
	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

type UpdateConfigDriverConfig struct {
	UpdateConfig struct {
		Image string
	} `mapstructure:"update_config"`

	EnvGroups []types.EnvGroupMeta `mapstructure:"env_groups"`

	Values map[string]interface{}
}

type UpdateConfigDriver struct {
	source      *Source
	target      *Target
	config      *UpdateConfigDriverConfig
	lookupTable *map[string]drivers.Driver
	output      map[string]interface{}
}

func NewUpdateConfigDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	driver := &UpdateConfigDriver{
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

func (d *UpdateConfigDriver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *UpdateConfigDriver) Apply(resource *models.Resource) (*models.Resource, error) {
	updateConfigDriverConfig, err := d.getConfig(resource)
	if err != nil {
		return nil, err
	}

	d.config = updateConfigDriverConfig

	client := config.GetAPIClient()

	_, err = client.GetRelease(
		context.Background(),
		d.target.Project,
		d.target.Cluster,
		d.target.Namespace,
		d.target.AppName,
	)

	shouldCreate := err != nil

	// FIXME: give tag option in config build, but override if PORTER_TAG is present
	tag := os.Getenv("PORTER_TAG")

	if tag == "" {
		commit, err := git.LastCommit()

		if err != nil {
			return nil, err
		}

		tag = commit.Sha[:7]
	}

	sharedOpts := &deploy.SharedOpts{
		ProjectID:   d.target.Project,
		ClusterID:   d.target.Cluster,
		OverrideTag: tag,
		Namespace:   d.target.Namespace,
		Method:      "registry",
		EnvGroups:   d.config.EnvGroups,
	}

	if shouldCreate {
		color.New(color.FgYellow).Printf("Could not read release %s/%s (%s): attempting creation\n", d.target.Namespace, d.target.AppName, err.Error())

		createAgent := &deploy.CreateAgent{
			Client: client,
			CreateOpts: &deploy.CreateOpts{
				SharedOpts:  sharedOpts,
				Kind:        d.source.Name,
				ReleaseName: d.target.AppName,
			},
		}

		subdomain, err := createAgent.CreateFromRegistry(d.config.UpdateConfig.Image, d.config.Values)

		if err != nil {
			return nil, err
		}

		d.output["live_url"] = subdomain
	} else {
		updateAgent, err := deploy.NewDeployAgent(client, d.target.AppName, &deploy.DeployOpts{
			SharedOpts: sharedOpts,
			Local:      false,
		})

		if err != nil {
			return nil, err
		}

		err = updateAgent.UpdateImageAndValues(d.config.Values)

		if err != nil {
			return nil, err
		}
	}

	return resource, nil
}

func (d *UpdateConfigDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}

func (d *UpdateConfigDriver) getConfig(resource *models.Resource) (*UpdateConfigDriverConfig, error) {
	populatedConf, err := drivers.ConstructConfig(&drivers.ConstructConfigOpts{
		RawConf:      resource.Config,
		LookupTable:  *d.lookupTable,
		Dependencies: resource.Dependencies,
	})

	if err != nil {
		return nil, err
	}

	config := &UpdateConfigDriverConfig{}

	err = mapstructure.Decode(populatedConf, config)

	if err != nil {
		return nil, err
	}

	return config, nil
}
