package preview

import (
	"math/rand"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

var seededRand *rand.Rand = rand.New(rand.NewSource(time.Now().UnixNano()))

type RandomStringDriverConfig struct {
	Length uint
}

type RandomStringDriver struct {
	output map[string]interface{}
	config *RandomStringDriverConfig
}

func NewRandomStringDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	driver := &RandomStringDriver{
		output: make(map[string]interface{}),
	}

	driverConfig := &RandomStringDriverConfig{}

	err := mapstructure.Decode(resource.Config, driverConfig)

	if err != nil {
		return nil, err
	}

	if driverConfig.Length == 0 {
		driverConfig.Length = 8
	}

	driver.config = driverConfig

	return driver, nil
}

func (d *RandomStringDriver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *RandomStringDriver) Apply(resource *models.Resource) (*models.Resource, error) {
	d.output["value"] = randomString(d.config.Length)

	return resource, nil
}

func (d *RandomStringDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}

func randomString(length uint) string {
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(b)
}
