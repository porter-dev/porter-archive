package preview

import (
	"crypto/rand"

	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/porter/internal/integrations/preview"
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

const defaultCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const lowerCharset = "abcdefghijklmnopqrstuvwxyz"

type RandomStringDriver struct {
	output map[string]interface{}
	config *preview.RandomStringDriverConfig
}

func NewRandomStringDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	driver := &RandomStringDriver{
		output: make(map[string]interface{}),
	}

	driverConfig := &preview.RandomStringDriverConfig{}

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
	useCharset := defaultCharset

	if d.config.Lower {
		useCharset = lowerCharset
	}

	d.output["value"] = randomString(int(d.config.Length), useCharset)

	return resource, nil
}

func (d *RandomStringDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}

func randomString(length int, charset string) string {
	ll := len(charset)
	b := make([]byte, length)
	rand.Read(b) // generates len(b) random bytes
	for i := 0; i < length; i++ {
		b[i] = charset[int(b[i])%ll]
	}
	return string(b)
}
