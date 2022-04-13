package preview

import (
	"fmt"

	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

type PushDriverConfig struct {
	Push struct {
		ForcePush bool `mapstructure:"force_push"`
		Image     string
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

	client := config.GetAPIClient()

	agent, err := docker.NewAgentWithAuthGetter(client, d.target.Project)
	if err != nil {
		return nil, err
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
