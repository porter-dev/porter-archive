package preview

import (
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

type UpgradeDriver struct {
	output map[string]interface{}
}

func NewUpgradeDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	return &UpgradeDriver{
		output: make(map[string]interface{}),
	}, nil
}

func (d *UpgradeDriver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *UpgradeDriver) Apply(resource *models.Resource) (*models.Resource, error) {
	return resource, nil
}

func (d *UpgradeDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}
