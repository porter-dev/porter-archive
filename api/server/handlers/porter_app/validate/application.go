package validate

import (
	"fmt"
)

type ServiceDiff struct {
	Name     string
	current  Service
	previous Service
}

func HydrateApplication(current, previous Application) (Application, error) {
	application := Application{}

	// handle service validation
	serviceDiffs := mergeApplicationsServices(current, previous)
	application.Services = make(map[string]Service)
	for _, serviceDiff := range serviceDiffs {
		service, err := HydrateService(serviceDiff.current, serviceDiff.previous, serviceDiff.Name)
		if err != nil {
			return application, err
		}
		application.Services[serviceDiff.Name] = service
	}

	if current.Image != nil {
		return application, nil
	}

	// handle build validation
	build, err := validateBuild(current.Build, previous.Build)
	if err != nil {
		return application, err
	}
	application.Build = build

	// handle env merge
	env := mergeEnv(current.Env, previous.Env)
	application.Env = env

	// handle release validation
	release, err := validateRelease(current.Release, previous.Release)
	if err != nil {
		return application, err
	}
	application.Release = release

	return application, nil
}

func validateBuild(current, previous *Build) (*Build, error) {
	// if current and previous are nil, return nil
	if current == nil && previous == nil {
		return nil, fmt.Errorf("Build settings must exist to create application")
	}

	// if current is nil and previous is not, return previous
	if current == nil && previous != nil {
		return previous, nil
	}

	return current, nil
}

func validateRelease(current, previous *Service) (*Service, error) {
	// handle release validation
	if current != nil && previous != nil {
		release, err := HydrateService(*current, *previous, "release")
		if err != nil {
			return nil, err
		}

		return &release, nil
	}

	if current != nil && previous == nil {
		release, err := HydrateService(*current, Service{}, "release")
		if err != nil {
			return nil, err
		}

		return &release, nil
	}

	if current == nil && previous != nil {
		release, err := HydrateService(Service{}, *previous, "release")
		if err != nil {
			return nil, err
		}

		return &release, nil
	}

	return nil, nil
}

func mergeApplicationsServices(current Application, previous Application) []ServiceDiff {
	serviceDiffs := []ServiceDiff{}

	for serviceName, serviceInCurrent := range current.Services {
		serviceInPrev, found := previous.Services[serviceName]
		if !found {
			serviceDiffs = append(serviceDiffs, ServiceDiff{
				Name:     serviceName,
				current:  serviceInCurrent,
				previous: Service{},
			})
		} else {
			serviceDiffs = append(serviceDiffs, ServiceDiff{
				Name:     serviceName,
				current:  serviceInCurrent,
				previous: serviceInPrev,
			})
		}
	}

	for serviceName, serviceInPrev := range previous.Services {
		if _, found := current.Services[serviceName]; !found {
			serviceDiffs = append(serviceDiffs, ServiceDiff{
				Name:     serviceName,
				current:  Service{},
				previous: serviceInPrev,
			})
		}
	}

	return serviceDiffs
}

func mergeEnv(current map[string]string, previous map[string]string) map[string]string {
	env := map[string]string{}

	for key, value := range previous {
		env[key] = value
	}

	for key, value := range current {
		env[key] = value
	}

	return env
}
