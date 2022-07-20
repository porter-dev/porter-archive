package preview

import (
	"context"
	"fmt"

	"github.com/fatih/color"
	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

type EnvGroupDriverConfig struct {
	EnvGroups []*types.EnvGroup `mapstructure:"env_groups"`
}

type EnvGroupDriver struct {
	output      map[string]interface{}
	lookupTable *map[string]drivers.Driver
	target      *Target
	config      *EnvGroupDriverConfig
}

func NewEnvGroupDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	driver := &EnvGroupDriver{
		lookupTable: opts.DriverLookupTable,
		output:      make(map[string]interface{}),
	}

	target, err := GetTarget(resource.Target)

	if err != nil {
		return nil, err
	}

	driver.target = target

	return driver, nil
}

func (d *EnvGroupDriver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *EnvGroupDriver) Apply(resource *models.Resource) (*models.Resource, error) {
	driverConfig, err := d.getConfig(resource)

	if err != nil {
		return nil, err
	}

	d.config = driverConfig

	client := config.GetAPIClient()

	for _, group := range d.config.EnvGroups {
		if group.Name == "" {
			return nil, fmt.Errorf("env group name cannot be empty")
		}

		if group.Namespace == "" {
			color.New(color.FgYellow).Printf("env group %s has empty namespace so defaulting to target namespace %s\n",
				group.Name, d.target.Namespace)

			group.Namespace = d.target.Namespace
		}

		envGroupResp, err := client.GetEnvGroup(
			context.Background(),
			d.target.Project,
			d.target.Cluster,
			group.Namespace,
			&types.GetEnvGroupRequest{
				Name: group.Name,
			},
		)

		if err != nil && err.Error() == "env group not found" {
			newEnvGroup, err := client.CreateEnvGroup(
				context.Background(), d.target.Project, d.target.Cluster, group.Namespace,
				&types.CreateEnvGroupRequest{
					Name:      group.Name,
					Variables: group.Variables,
				},
			)

			if err != nil {
				return nil, err
			}

			envGroupResp = &types.GetEnvGroupResponse{
				EnvGroup: &types.EnvGroup{
					Name:      newEnvGroup.Name,
					Variables: newEnvGroup.Variables,
				},
			}
		} else if err != nil {
			return nil, err
		}

		d.output[envGroupResp.Name] = map[string]interface{}{
			"variables": envGroupResp.Variables,
		}
	}

	return resource, nil
}

func (d *EnvGroupDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}

func (d *EnvGroupDriver) getConfig(resource *models.Resource) (*EnvGroupDriverConfig, error) {
	populatedConf, err := drivers.ConstructConfig(&drivers.ConstructConfigOpts{
		RawConf:      resource.Config,
		LookupTable:  *d.lookupTable,
		Dependencies: resource.Dependencies,
	})

	if err != nil {
		return nil, err
	}

	config := &EnvGroupDriverConfig{}

	err = mapstructure.Decode(populatedConf, config)

	if err != nil {
		return nil, err
	}

	return config, nil
}
