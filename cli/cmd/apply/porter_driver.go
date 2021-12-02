package apply

import (
	"github.com/porter-dev/switchboard/internal/models"
	"github.com/porter-dev/switchboard/pkg/drivers"
)

type Driver struct {
}

func NewPorterDriver() drivers.Driver {
	return &Driver{}
}

func (d *Driver) ShouldApply(resource *models.Resource) bool {

}

func (d *Driver) Apply(resource *models.Resource) (*models.Resource, error) {

}

func (d *Driver) Output() (map[string]interface{}, error) {

}
