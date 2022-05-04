package preview

import (
	"os"
	"strings"

	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

type OSEnvDriver struct {
	output map[string]interface{}
}

func NewOSEnvDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	return &OSEnvDriver{
		output: make(map[string]interface{}),
	}, nil
}

func (d *OSEnvDriver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *OSEnvDriver) Apply(resource *models.Resource) (*models.Resource, error) {
	for _, key := range os.Environ() {
		keyVal := strings.Split(key, "=")

		if len(keyVal) == 2 && keyVal[0] != "" && keyVal[1] != "" &&
			strings.HasPrefix(keyVal[0], "PORTER_APPLY_") {
			envName := strings.TrimPrefix(keyVal[0], "PORTER_APPLY_")

			if len(envName) > 0 {
				d.output[envName] = keyVal[1]
			}
		}
	}

	return resource, nil
}

func (d *OSEnvDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}
