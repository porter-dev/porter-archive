package preview

import (
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

type PushDriver struct {
	output map[string]interface{}
}

func NewPushDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	return &PushDriver{
		output: make(map[string]interface{}),
	}, nil
}

func (d *PushDriver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *PushDriver) Apply(resource *models.Resource) (*models.Resource, error) {
	return resource, nil
}

func (d *PushDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}
