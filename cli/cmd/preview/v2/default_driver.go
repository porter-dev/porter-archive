package v2

import "github.com/porter-dev/switchboard/v2/pkg/types"

type DefaultDriver struct {
}

func NewDefaultDriver() *DefaultDriver {
	return &DefaultDriver{}
}

func (d *DefaultDriver) PreApply(resource *types.Resource) error {
	return nil
}

func (d *DefaultDriver) Apply(resource *types.Resource) error {
	return nil
}

func (d *DefaultDriver) PostApply(resource *types.Resource) error {
	return nil
}

func (d *DefaultDriver) OnError(resource *types.Resource, err error) {

}
