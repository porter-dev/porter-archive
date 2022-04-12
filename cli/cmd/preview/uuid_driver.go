package preview

import (
	"github.com/google/uuid"
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

type UUIDDriver struct {
	output map[string]interface{}
}

func NewUUIDDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	return &BuildDriver{
		output: make(map[string]interface{}),
	}, nil
}

func (d *UUIDDriver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *UUIDDriver) Apply(resource *models.Resource) (*models.Resource, error) {
	d.output["uuid"] = uuid.NewString()

	return resource, nil
}

func (d *UUIDDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}
