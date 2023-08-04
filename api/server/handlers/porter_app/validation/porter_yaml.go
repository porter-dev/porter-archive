package validation

import (
	"context"
	"fmt"
	"strings"

	"github.com/ghodss/yaml"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/telemetry"
)

type AppDefinition struct {
	Name             string `json:"name"`
	PorterYAMLBase64 string `json:"porter_yaml"`
}

func getType(name string, service *Service) (porterv1.ServiceType, error) {
	var serviceType porterv1.ServiceType

	if service.Type != "" {
		if service.Type == "web" {
			return porterv1.ServiceType_SERVICE_TYPE_WEB, nil
		}
		if service.Type == "worker" {
			return porterv1.ServiceType_SERVICE_TYPE_WORKER, nil
		}
		if service.Type == "job" {
			return porterv1.ServiceType_SERVICE_TYPE_JOB, nil
		}

		return serviceType, fmt.Errorf("invalid service type '%s'", service.Type)
	}

	if strings.Contains(name, "web") {
		return porterv1.ServiceType_SERVICE_TYPE_WEB, nil
	}

	if strings.Contains(name, "wkr") {
		return porterv1.ServiceType_SERVICE_TYPE_WORKER, nil
	}

	return porterv1.ServiceType_SERVICE_TYPE_JOB, nil
}

func ConvertAppsFromYaml(file []byte) (map[string]*porterv1.PorterApp, error) {
	ctx, span := telemetry.NewSpan(context.Background(), "convert-apps-from-porter-yaml")
	defer span.End()

	porterYaml := &PorterStackYAML{}
	err := yaml.Unmarshal(file, porterYaml)
	if err != nil {
		return nil, err
	}

	// convert each app in the app group into a valid standalone definition
	apps, err := getAppsFromApplicationGroup(*porterYaml)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting apps from application group")
	}

	validatedApps := make(map[string]*porterv1.PorterApp)
	for _, app := range apps {
		validApp := &porterv1.PorterApp{
			Name: app.Name,
			Env:  app.Env,
			Build: &porterv1.Build{
				Context:    app.Build.Context,
				Method:     app.Build.Method,
				Builder:    app.Build.Builder,
				Buildpacks: app.Build.Buildpacks,
				Dockerfile: app.Build.Dockerfile,
			},
		}

		services := make(map[string]*porterv1.Service, 0)
		for name, service := range app.Services {
			serviceType, err := getType(name, service)
			if err != nil {
				return nil, telemetry.Error(ctx, span, err, "error getting service type")
			}

			validService, err := castServiceConfig(service, serviceType)
			if err != nil {
				return nil, telemetry.Error(ctx, span, err, "error casting service config")
			}

			services[name] = validService
		}
		validApp.Services = services

		if app.Release != nil {
			release, err := castServiceConfig(app.Release, porterv1.ServiceType_SERVICE_TYPE_JOB)
			if err != nil {
				return nil, telemetry.Error(ctx, span, err, "error casting release config")
			}
			validApp.Release = release
		}

		validatedApps[app.Name] = validApp
	}

	return validatedApps, nil
}

func castYamltoApp(porterYaml PorterStackYAML) (Application, error) {
	application := Application{}

	var services map[string]*Service

	if porterYaml.Services == nil && porterYaml.Apps == nil {
		return application, fmt.Errorf("no apps or services defined in porter yaml")
	}

	if porterYaml.Services != nil && porterYaml.Apps != nil {
		return application, fmt.Errorf("both apps and services defined in porter yaml")
	}

	if porterYaml.Apps != nil {
		services = porterYaml.Apps
	}

	if porterYaml.Services != nil {
		services = porterYaml.Services
	}

	application = Application{
		Name:     porterYaml.Name,
		Env:      porterYaml.Env,
		Services: services,
		Build:    porterYaml.Build,
		Release:  porterYaml.Release,
	}

	return application, nil
}

func castServiceConfig(service *Service, serviceType porterv1.ServiceType) (*porterv1.Service, error) {
	configYaml, err := yaml.Marshal(service.Config)
	if err != nil {
		return nil, fmt.Errorf("Unable to marshal service config: %w", err)
	}

	configBytes, err := yaml.YAMLToJSON(configYaml)
	if err != nil {
		return nil, fmt.Errorf("Unable to convert service config to JSON: %w", err)
	}

	validSevice := &porterv1.Service{
		Run:  service.Run,
		Type: serviceType,
	}

	if service.Config == nil {
		return validSevice, nil
	}

	switch serviceType {
	case porterv1.ServiceType_SERVICE_TYPE_UNSPECIFIED:
		return nil, fmt.Errorf("Service type unspecified")
	case porterv1.ServiceType_SERVICE_TYPE_WEB:
		webConfig := &porterv1.WebServiceConfig{}
		err := helpers.UnmarshalContractObject(configBytes, webConfig)
		if err != nil {
			return nil, fmt.Errorf("error unmarshaling web service config: %w", err)
		}

		validSevice.Config = &porterv1.Service_WebConfig{
			WebConfig: webConfig,
		}

	case porterv1.ServiceType_SERVICE_TYPE_WORKER:
		workerConfig := &porterv1.WorkerServiceConfig{}
		err := helpers.UnmarshalContractObject(configBytes, workerConfig)
		if err != nil {
			return nil, fmt.Errorf("Error unmarshaling worker service config: %w", err)
		}

		validSevice.Config = &porterv1.Service_WorkerConfig{
			WorkerConfig: workerConfig,
		}
	case porterv1.ServiceType_SERVICE_TYPE_JOB:
		jobConfig := &porterv1.JobServiceConfig{}
		err := helpers.UnmarshalContractObject(configBytes, jobConfig)
		if err != nil {
			return nil, fmt.Errorf("Error unmarshaling job service config: %w", err)
		}

		validSevice.Config = &porterv1.Service_JobConfig{
			JobConfig: jobConfig,
		}
	}

	return validSevice, nil
}

func getAppsFromApplicationGroup(porterYaml PorterStackYAML) ([]Application, error) {
	ctx, span := telemetry.NewSpan(context.Background(), "extract-apps-from-porter-yaml")
	defer span.End()

	apps := make([]Application, 0)

	if porterYaml.Applications == nil {
		app, err := castYamltoApp(porterYaml)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error getting single app from porter yaml")
		}

		apps = append(apps, app)
		return apps, nil
	}

	for name, app := range porterYaml.Applications {
		if app.Services == nil {
			return nil, telemetry.Error(ctx, span, nil, "no services defined for an app in porter yaml")
		}

		apps = append(apps, Application{
			Name:     name,
			Env:      app.Env,
			Services: app.Services,
			Build:    app.Build,
			Release:  app.Release,
		})
	}

	return apps, nil
}
