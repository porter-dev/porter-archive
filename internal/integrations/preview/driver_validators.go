package preview

import (
	"fmt"
	"strings"

	"github.com/docker/distribution/reference"
	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/switchboard/pkg/types"
	"k8s.io/apimachinery/pkg/util/validation"
)

func commonValidator(resource *types.Resource) (*Source, *Target, error) {
	source := &Source{}

	err := mapstructure.Decode(resource.Source, source)

	if err != nil {
		return nil, nil, fmt.Errorf("for resource '%s': error parsing source: %w", resource.Name, err)
	}

	target := &Target{}

	err = mapstructure.Decode(resource.Target, target)

	if err != nil {
		return nil, nil, fmt.Errorf("for resource '%s': error parsing target: %w", resource.Name, err)
	}

	return source, target, nil
}

func deployDriverValidator(resource *types.Resource) error {
	source, _, err := commonValidator(resource)

	if err != nil {
		return err
	}

	if source.Name == "" {
		return fmt.Errorf("for resource '%s': source name cannot be empty", resource.Name)
	}

	if source.Repo == "" {
		if source.Name == "web" || source.Name == "worker" || source.Name == "job" {
			source.Repo = "https://charts.getporter.dev"
		} else {
			source.Repo = "https://chart-addons.getporter.dev"
		}
	}

	if source.Repo == "https://charts.getporter.dev" {
		appConfig := &ApplicationConfig{}

		err = mapstructure.Decode(resource.Config, appConfig)

		if err != nil {
			return fmt.Errorf("for resource '%s': error parsing config: %w", resource.Name, err)
		}

		if appConfig.Build.Method == "" {
			return fmt.Errorf("for resource '%s': build method cannot be empty", resource.Name)
		} else if appConfig.Build.Method != "docker" &&
			appConfig.Build.Method != "pack" &&
			appConfig.Build.Method != "registry" {
			return fmt.Errorf("for resource '%s': build method must be one of 'docker', 'pack', or 'registry'", resource.Name)
		}

		if appConfig.Build.Method == "registry" {
			if appConfig.Build.Image == "" {
				return fmt.Errorf("for resource '%s': image cannot be empty when using the 'registry' build method",
					resource.Name)
			} else if !strings.Contains(appConfig.Build.Image, "{") {
				if len(strings.Split(appConfig.Build.Image, ":")) != 2 {
					return fmt.Errorf("for resource '%s': image must be in the format 'image:tag'", resource.Name)
				}

				// check for valid image
				_, err := reference.ParseNamed(appConfig.Build.Image)

				if err != nil {
					return fmt.Errorf("for resource '%s': error parsing image: %w", resource.Name, err)
				}
			}
		}

		for _, eg := range appConfig.EnvGroups {
			if errStrs := validation.IsDNS1123Label(eg.Name); len(errStrs) > 0 {
				str := fmt.Sprintf("for resource '%s': invalid characters found in env group '%s' name:",
					resource.Name, eg.Name)
				for _, errStr := range errStrs {
					str += fmt.Sprintf("\n  * %s", errStr)
				}

				return fmt.Errorf("%s", str)
			}
		}

		if len(appConfig.Values) > 0 {
			if source.Name == "web" {
				err := validateWebChartValues(appConfig.Values)

				if err != nil {
					return fmt.Errorf("for resource '%s': error validating values for web deployment: %w",
						resource.Name, err)
				}
			} else if source.Name == "worker" {
				err := validateWorkerChartValues(appConfig.Values)

				if err != nil {
					return fmt.Errorf("for resource '%s': error validating values for worker deployment: %w",
						resource.Name, err)
				}
			} else if source.Name == "job" {
				err := validateJobChartValues(appConfig.Values)

				if err != nil {
					return fmt.Errorf("for resource '%s': error validating values for job deployment: %w",
						resource.Name, err)
				}
			}
		}
	} else if source.Repo == "https://chart-addons.getporter.dev" {
		if len(resource.Config) > 0 {
			if source.Name == "postgresql" {
				err := validatePostgresChartValues(resource.Config)

				if err != nil {
					return fmt.Errorf("for resource '%s': error validating values for postgresql deployment: %w",
						resource.Name, err)
				}
			}
		}
	}

	return nil
}

func buildImageDriverValidator(resource *types.Resource) error {
	_, target, err := commonValidator(resource)

	if err != nil {
		return err
	}

	if target.AppName == "" {
		return fmt.Errorf("for resource '%s': target app_name is missing", resource.Name)
	} else {
		errStrs := validation.IsDNS1123Label(target.AppName)

		if len(errStrs) > 0 {
			str := fmt.Sprintf("for resource '%s': invalid characters found in app_name:", resource.Name)
			for _, errStr := range errStrs {
				str += fmt.Sprintf("\n  * %s", errStr)
			}

			return fmt.Errorf("%s", str)
		}
	}

	driverConfig := &BuildDriverConfig{}

	err = mapstructure.Decode(resource.Config, driverConfig)

	if err != nil {
		return fmt.Errorf("for resource '%s': error parsing config: %w", resource.Name, err)
	}

	if driverConfig.Build.Method == "" {
		return fmt.Errorf("for resource '%s': build method cannot be empty", resource.Name)
	} else if driverConfig.Build.Method != "docker" &&
		driverConfig.Build.Method != "pack" &&
		driverConfig.Build.Method != "registry" {
		return fmt.Errorf("for resource '%s': build method must be one of 'docker', 'pack', or 'registry'", resource.Name)
	}

	if driverConfig.Build.Method == "registry" {
		if driverConfig.Build.Image == "" {
			return fmt.Errorf("for resource '%s': image cannot be empty when using the 'registry' build method",
				resource.Name)
		} else if !strings.Contains(driverConfig.Build.Image, "{") {
			if len(strings.Split(driverConfig.Build.Image, ":")) != 2 {
				return fmt.Errorf("for resource '%s': image must be in the format 'image:tag'", resource.Name)
			}

			// check for valid image
			_, err := reference.ParseNamed(driverConfig.Build.Image)

			if err != nil {
				return fmt.Errorf("for resource '%s': error parsing image: %w", resource.Name, err)
			}
		}
	}

	for _, eg := range driverConfig.EnvGroups {
		if errStrs := validation.IsDNS1123Label(eg.Name); len(errStrs) > 0 {
			str := fmt.Sprintf("for resource '%s': invalid characters found in env group '%s' name:",
				resource.Name, eg.Name)
			for _, errStr := range errStrs {
				str += fmt.Sprintf("\n  * %s", errStr)
			}

			return fmt.Errorf("%s", str)
		}
	}

	return nil
}

func pushImageDriverValidator(resource *types.Resource) error {
	_, target, err := commonValidator(resource)

	if err != nil {
		return err
	}

	if target.AppName == "" {
		return fmt.Errorf("for resource '%s': target app_name is missing", resource.Name)
	} else {
		errStrs := validation.IsDNS1123Label(target.AppName)

		if len(errStrs) > 0 {
			str := fmt.Sprintf("for resource '%s': invalid characters found in app_name:", resource.Name)
			for _, errStr := range errStrs {
				str += fmt.Sprintf("\n  * %s", errStr)
			}

			return fmt.Errorf("%s", str)
		}
	}

	driverConfig := &PushDriverConfig{}

	err = mapstructure.Decode(resource.Config, driverConfig)

	if err != nil {
		return fmt.Errorf("for resource '%s': error parsing config: %w", resource.Name, err)
	}

	if driverConfig.Push.Image == "" {
		return fmt.Errorf("for resource '%s': image cannot be empty", resource.Name)
	} else if !strings.Contains(driverConfig.Push.Image, "{") {
		if len(strings.Split(driverConfig.Push.Image, ":")) != 2 {
			return fmt.Errorf("for resource '%s': image must be in the format 'image:tag'", resource.Name)
		}

		// check for valid image
		_, err := reference.ParseNamed(driverConfig.Push.Image)

		if err != nil {
			return fmt.Errorf("for resource '%s': error parsing image: %w", resource.Name, err)
		}
	}

	return nil
}

func updateConfigDriverValidator(resource *types.Resource) error {
	source, target, err := commonValidator(resource)

	if err != nil {
		return err
	}

	if target.AppName == "" {
		return fmt.Errorf("for resource '%s': target app_name is missing", resource.Name)
	} else {
		errStrs := validation.IsDNS1123Label(target.AppName)

		if len(errStrs) > 0 {
			str := fmt.Sprintf("for resource '%s': invalid characters found in app_name:", resource.Name)
			for _, errStr := range errStrs {
				str += fmt.Sprintf("\n  * %s", errStr)
			}

			return fmt.Errorf("%s", str)
		}
	}

	if source.Repo == "" {
		if source.Name == "web" || source.Name == "worker" || source.Name == "job" {
			source.Repo = "https://charts.getporter.dev"
		} else {
			source.Repo = "https://chart-addons.getporter.dev"
		}
	}

	driverConfig := &UpdateConfigDriverConfig{}

	err = mapstructure.Decode(resource.Config, driverConfig)

	if err != nil {
		return fmt.Errorf("for resource '%s': error parsing config: %w", resource.Name, err)
	}

	if driverConfig.UpdateConfig.Image == "" {
		return fmt.Errorf("for resource '%s': image cannot be empty", resource.Name)
	}

	for _, eg := range driverConfig.EnvGroups {
		if errStrs := validation.IsDNS1123Label(eg.Name); len(errStrs) > 0 {
			str := fmt.Sprintf("for resource '%s': invalid characters found in env group '%s' name:",
				resource.Name, eg.Name)
			for _, errStr := range errStrs {
				str += fmt.Sprintf("\n  * %s", errStr)
			}

			return fmt.Errorf("%s", str)
		}
	}

	if len(driverConfig.Values) > 0 && source.Repo == "https://charts.getporter.dev" {
		if source.Name == "web" {
			err := validateWebChartValues(driverConfig.Values)

			if err != nil {
				return fmt.Errorf("for resource '%s': error validating values for web deployment: %w",
					resource.Name, err)
			}
		} else if source.Name == "worker" {
			err := validateWorkerChartValues(driverConfig.Values)

			if err != nil {
				return fmt.Errorf("for resource '%s': error validating values for worker deployment: %w",
					resource.Name, err)
			}
		} else if source.Name == "job" {
			err := validateJobChartValues(driverConfig.Values)

			if err != nil {
				return fmt.Errorf("for resource '%s': error validating values for job deployment: %w",
					resource.Name, err)
			}
		}
	}

	return nil
}

func randomStringDriverValidator(resource *types.Resource) error {
	driverConfig := &RandomStringDriverConfig{}

	err := mapstructure.Decode(resource.Config, driverConfig)

	if err != nil {
		return fmt.Errorf("for resource '%s': error parsing config: %w", resource.Name, err)
	}

	return nil
}

func envGroupDriverValidator(resource *types.Resource) error {
	target := &Target{}

	err := mapstructure.Decode(resource.Target, target)

	if err != nil {
		return fmt.Errorf("for resource '%s': error parsing target: %w", resource.Name, err)
	}

	config := &EnvGroupDriverConfig{}

	err = mapstructure.Decode(resource.Config, config)

	if err != nil {
		return fmt.Errorf("for resource '%s': error parsing config: %w", resource.Name, err)
	}

	for _, eg := range config.EnvGroups {
		if errStrs := validation.IsDNS1123Label(eg.Name); len(errStrs) > 0 {
			str := fmt.Sprintf("for resource '%s': invalid characters found in env group '%s' name:",
				resource.Name, eg.Name)
			for _, errStr := range errStrs {
				str += fmt.Sprintf("\n  * %s", errStr)
			}

			return fmt.Errorf("%s", str)
		}
	}

	return nil
}

func osEnvDriverValidator(resource *types.Resource) error {
	return nil
}
