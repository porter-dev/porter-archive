package v2

import (
	"context"
	"errors"
	"fmt"
	"strings"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/telemetry"
	"gopkg.in/yaml.v2"
)

// AppProtoWithEnv is a struct containing a PorterApp proto object and its environment variables
type AppProtoWithEnv struct {
	AppProto     *porterv1.PorterApp
	Addons       []*porterv1.Addon
	EnvVariables map[string]string
}

// AppWithPreviewOverrides is a porter app definition with its preview app definition, if it exists
type AppWithPreviewOverrides struct {
	AppProtoWithEnv
	PreviewApp *AppProtoWithEnv
}

// AppProtoFromYaml converts a Porter YAML file into a PorterApp proto object
func AppProtoFromYaml(ctx context.Context, porterYamlBytes []byte) (AppWithPreviewOverrides, error) {
	ctx, span := telemetry.NewSpan(ctx, "v2-app-proto-from-yaml")
	defer span.End()

	var out AppWithPreviewOverrides

	if porterYamlBytes == nil {
		return out, telemetry.Error(ctx, span, nil, "porter yaml is nil")
	}

	porterYaml := &PorterYAML{}
	err := yaml.Unmarshal(porterYamlBytes, porterYaml)
	if err != nil {
		return out, telemetry.Error(ctx, span, err, "error unmarshaling porter yaml")
	}

	appProto, envVariables, err := ProtoFromApp(ctx, porterYaml.PorterApp)
	if err != nil {
		return out, telemetry.Error(ctx, span, err, "error converting porter yaml to proto")
	}
	out.AppProto = appProto
	out.EnvVariables = envVariables

	var addons []*porterv1.Addon
	for _, addon := range porterYaml.Addons {
		addonProto, err := ProtoFromAddon(ctx, addon)
		if err != nil {
			return out, telemetry.Error(ctx, span, err, "error converting addon to proto")
		}
		addons = append(addons, addonProto)
	}
	out.Addons = addons

	if porterYaml.Previews != nil {
		previewConfig := *porterYaml.Previews

		previewAppProto, previewEnvVariables, err := ProtoFromApp(ctx, previewConfig.PorterApp)
		if err != nil {
			return out, telemetry.Error(ctx, span, err, "error converting preview porter yaml to proto")
		}
		out.PreviewApp = &AppProtoWithEnv{
			AppProto:     previewAppProto,
			EnvVariables: previewEnvVariables,
		}

		var previewAddons []*porterv1.Addon
		for _, addon := range previewConfig.Addons {
			addonProto, err := ProtoFromAddon(ctx, addon)
			if err != nil {
				return out, telemetry.Error(ctx, span, err, "error converting preview addon to proto")
			}
			previewAddons = append(previewAddons, addonProto)
		}
		out.PreviewApp.Addons = previewAddons
	}

	return out, nil
}

// ServiceType is the type of a service in a Porter YAML file
type ServiceType string

const (
	// ServiceType_Web is type for web services specified in Porter YAML
	ServiceType_Web ServiceType = "web"
	// ServiceType_Worker is type for worker services specified in Porter YAML
	ServiceType_Worker ServiceType = "worker"
	// ServiceType_Job is type for job services specified in Porter YAML
	ServiceType_Job ServiceType = "job"
)

// EnvGroup is a struct containing the name and version of an environment group
type EnvGroup struct {
	Name    string `yaml:"name"`
	Version int    `yaml:"version"`
}

// PorterApp represents all the possible fields in a Porter YAML file
type PorterApp struct {
	Version  string            `yaml:"version,omitempty"`
	Name     string            `yaml:"name"`
	Services []Service         `yaml:"services"`
	Image    *Image            `yaml:"image,omitempty"`
	Build    *Build            `yaml:"build,omitempty"`
	Env      map[string]string `yaml:"env,omitempty"`

	Predeploy    *Service      `yaml:"predeploy,omitempty"`
	EnvGroups    []EnvGroup    `yaml:"envGroups,omitempty"`
	EfsStorage   *EfsStorage   `yaml:"efsStorage,omitempty"`
	RequiredApps []RequiredApp `yaml:"requiredApps,omitempty"`
}

// PorterAppWithAddons is the definition of a porter app in a Porter YAML file with addons
type PorterAppWithAddons struct {
	PorterApp `yaml:",inline"`
	Addons    []Addon `yaml:"addons,omitempty"`
}

// PorterYAML represents all the possible fields in a Porter YAML file
type PorterYAML struct {
	PorterAppWithAddons `yaml:",inline"`
	Previews            *PorterAppWithAddons `yaml:"previews,omitempty"`
}

// Addon represents an addon that should be installed alongside a Porter app
type Addon struct {
	Name             string     `yaml:"name"`
	Type             string     `yaml:"type"`
	EnvGroups        []EnvGroup `yaml:"envGroups,omitempty"`
	CpuCores         float32    `yaml:"cpuCores,omitempty"`
	RamMegabytes     int        `yaml:"ramMegabytes,omitempty"`
	StorageGigabytes float32    `yaml:"storageGigabytes,omitempty"`
}

// RequiredApp specifies another porter app that this app expects to be deployed alongside it
type RequiredApp struct {
	Name       string `yaml:"name"`
	FromTarget string `yaml:"fromTarget"`
}

// EfsStorage represents the EFS storage settings for a Porter app
type EfsStorage struct {
	Enabled bool `yaml:"enabled"`
}

// Build represents the build settings for a Porter app
type Build struct {
	Context    string   `yaml:"context" validate:"dir"`
	Method     string   `yaml:"method" validate:"required,oneof=pack docker registry"`
	Builder    string   `yaml:"builder" validate:"required_if=Method pack"`
	Buildpacks []string `yaml:"buildpacks"`
	Dockerfile string   `yaml:"dockerfile" validate:"required_if=Method docker"`
	CommitSHA  string   `yaml:"commitSha"`
}

// Image is the repository and tag for an app's build image
type Image struct {
	Repository string `yaml:"repository"`
	Tag        string `yaml:"tag"`
}

// Service represents a single service in a porter app
type Service struct {
	Name                          string            `yaml:"name,omitempty"`
	Run                           *string           `yaml:"run,omitempty"`
	Type                          ServiceType       `yaml:"type,omitempty" validate:"required, oneof=web worker job"`
	Instances                     *int32            `yaml:"instances,omitempty"`
	CpuCores                      float32           `yaml:"cpuCores,omitempty"`
	RamMegabytes                  int               `yaml:"ramMegabytes,omitempty"`
	GpuCoresNvidia                float32           `yaml:"gpuCoresNvidia,omitempty"`
	GPU                           *GPU              `yaml:"gpu,omitempty"`
	SmartOptimization             *bool             `yaml:"smartOptimization,omitempty"`
	TerminationGracePeriodSeconds *int32            `yaml:"terminationGracePeriodSeconds,omitempty"`
	Port                          int               `yaml:"port,omitempty"`
	Autoscaling                   *AutoScaling      `yaml:"autoscaling,omitempty" validate:"excluded_if=Type job"`
	Domains                       []Domains         `yaml:"domains,omitempty" validate:"excluded_unless=Type web"`
	HealthCheck                   *HealthCheck      `yaml:"healthCheck,omitempty" validate:"excluded_unless=Type web"`
	AllowConcurrent               *bool             `yaml:"allowConcurrent,omitempty" validate:"excluded_unless=Type job"`
	Cron                          string            `yaml:"cron,omitempty" validate:"excluded_unless=Type job"`
	SuspendCron                   *bool             `yaml:"suspendCron,omitempty" validate:"excluded_unless=Type job"`
	TimeoutSeconds                int               `yaml:"timeoutSeconds,omitempty" validate:"excluded_unless=Type job"`
	Private                       *bool             `yaml:"private,omitempty" validate:"excluded_unless=Type web"`
	IngressAnnotations            map[string]string `yaml:"ingressAnnotations,omitempty" validate:"excluded_unless=Type web"`
	DisableTLS                    *bool             `yaml:"disableTLS,omitempty" validate:"excluded_unless=Type web"`
}

// AutoScaling represents the autoscaling settings for web services
type AutoScaling struct {
	Enabled                bool `yaml:"enabled"`
	MinInstances           int  `yaml:"minInstances"`
	MaxInstances           int  `yaml:"maxInstances"`
	CpuThresholdPercent    int  `yaml:"cpuThresholdPercent"`
	MemoryThresholdPercent int  `yaml:"memoryThresholdPercent"`
}

// GPU represents GPU settings for a service
type GPU struct {
	Enabled        bool `yaml:"enabled"`
	GpuCoresNvidia int  `yaml:"gpuCoresNvidia"`
}

// Domains are the custom domains for a web service
type Domains struct {
	Name string `yaml:"name"`
}

// HealthCheck is the health check settings for a web service
type HealthCheck struct {
	Enabled  bool   `yaml:"enabled"`
	HttpPath string `yaml:"httpPath"`
}

// ProtoFromApp converts a PorterApp type to a base PorterApp proto type and returns env variables
func ProtoFromApp(ctx context.Context, porterApp PorterApp) (*porterv1.PorterApp, map[string]string, error) {
	ctx, span := telemetry.NewSpan(ctx, "build-app-proto")
	defer span.End()

	appProto := &porterv1.PorterApp{
		Name: porterApp.Name,
	}

	if porterApp.Build != nil {
		appProto.Build = &porterv1.Build{
			Context:    porterApp.Build.Context,
			Method:     porterApp.Build.Method,
			Builder:    porterApp.Build.Builder,
			Buildpacks: porterApp.Build.Buildpacks,
			Dockerfile: porterApp.Build.Dockerfile,
			CommitSha:  porterApp.Build.CommitSHA,
		}
	}

	if porterApp.Image != nil {
		appProto.Image = &porterv1.AppImage{
			Repository: porterApp.Image.Repository,
			Tag:        porterApp.Image.Tag,
		}
	}

	// service map is only needed for backwards compatibility at this time
	serviceMap := make(map[string]*porterv1.Service)
	var services []*porterv1.Service

	for _, service := range porterApp.Services {
		serviceType := protoEnumFromType(service.Name, service)

		serviceProto, err := serviceProtoFromConfig(service, serviceType)
		if err != nil {
			return appProto, nil, telemetry.Error(ctx, span, err, "error casting service config")
		}
		if service.Name == "" {
			return appProto, nil, telemetry.Error(ctx, span, nil, "service found with no name")
		}

		services = append(services, serviceProto)
		serviceMap[service.Name] = serviceProto
	}
	appProto.ServiceList = services
	appProto.Services = serviceMap // nolint:staticcheck // temporarily using deprecated field for backwards compatibility

	if porterApp.Predeploy != nil {
		predeployProto, err := serviceProtoFromConfig(*porterApp.Predeploy, porterv1.ServiceType_SERVICE_TYPE_JOB)
		if err != nil {
			return appProto, nil, telemetry.Error(ctx, span, err, "error casting predeploy config")
		}
		appProto.Predeploy = predeployProto
	}

	envGroups := make([]*porterv1.EnvGroup, 0)
	if porterApp.EnvGroups != nil {
		for _, envGroup := range porterApp.EnvGroups {
			envGroups = append(envGroups, &porterv1.EnvGroup{
				Name:    envGroup.Name,
				Version: int64(envGroup.Version),
			})
		}
	}
	appProto.EnvGroups = envGroups

	if porterApp.EfsStorage != nil {
		appProto.EfsStorage = &porterv1.EFS{
			Enabled: porterApp.EfsStorage.Enabled,
		}
	}

	for _, requiredApp := range porterApp.RequiredApps {
		var targetIdentifier *porterv1.DeploymentTargetIdentifier

		if requiredApp.Name == "" {
			return appProto, nil, telemetry.Error(ctx, span, nil, "required app specified with no name")
		}

		if requiredApp.FromTarget != "" {
			targetIdentifier = &porterv1.DeploymentTargetIdentifier{
				Name: requiredApp.FromTarget,
			}
		}

		appProto.RequiredApps = append(appProto.RequiredApps, &porterv1.RequiredApp{
			Name:       requiredApp.Name,
			FromTarget: targetIdentifier,
		})
	}

	return appProto, porterApp.Env, nil
}

func protoEnumFromType(name string, service Service) porterv1.ServiceType {
	serviceType := porterv1.ServiceType_SERVICE_TYPE_WORKER

	if strings.Contains(name, "web") {
		serviceType = porterv1.ServiceType_SERVICE_TYPE_WEB
	}
	if strings.Contains(name, "wkr") || strings.Contains(name, "worker") {
		serviceType = porterv1.ServiceType_SERVICE_TYPE_WORKER
	}
	if strings.Contains(name, "job") {
		serviceType = porterv1.ServiceType_SERVICE_TYPE_JOB
	}

	switch service.Type {
	case "web":
		serviceType = porterv1.ServiceType_SERVICE_TYPE_WEB
	case "worker":
		serviceType = porterv1.ServiceType_SERVICE_TYPE_WORKER
	case "job":
		serviceType = porterv1.ServiceType_SERVICE_TYPE_JOB
	}

	return serviceType
}

func serviceProtoFromConfig(service Service, serviceType porterv1.ServiceType) (*porterv1.Service, error) {
	serviceProto := &porterv1.Service{
		Name:                          service.Name,
		RunOptional:                   service.Run,
		InstancesOptional:             service.Instances,
		CpuCores:                      service.CpuCores,
		RamMegabytes:                  int32(service.RamMegabytes),
		GpuCoresNvidia:                service.GpuCoresNvidia,
		Port:                          int32(service.Port),
		SmartOptimization:             service.SmartOptimization,
		Type:                          serviceType,
		TerminationGracePeriodSeconds: service.TerminationGracePeriodSeconds,
	}

	gpu := &porterv1.GPU{
		Enabled:        service.GPU.Enabled,
		GpuCoresNvidia: int32(service.GPU.GpuCoresNvidia),
	}

	serviceProto.Gpu = gpu

	switch serviceType {
	default:
		return nil, fmt.Errorf("invalid service type '%s'", serviceType)
	case porterv1.ServiceType_SERVICE_TYPE_UNSPECIFIED:
		return nil, errors.New("Service type unspecified")
	case porterv1.ServiceType_SERVICE_TYPE_WEB:
		webConfig := &porterv1.WebServiceConfig{}

		var autoscaling *porterv1.Autoscaling
		if service.Autoscaling != nil {
			autoscaling = &porterv1.Autoscaling{
				Enabled:                service.Autoscaling.Enabled,
				MinInstances:           int32(service.Autoscaling.MinInstances),
				MaxInstances:           int32(service.Autoscaling.MaxInstances),
				CpuThresholdPercent:    int32(service.Autoscaling.CpuThresholdPercent),
				MemoryThresholdPercent: int32(service.Autoscaling.MemoryThresholdPercent),
			}
		}
		webConfig.Autoscaling = autoscaling

		var healthCheck *porterv1.HealthCheck
		if service.HealthCheck != nil {
			healthCheck = &porterv1.HealthCheck{
				Enabled:  service.HealthCheck.Enabled,
				HttpPath: service.HealthCheck.HttpPath,
			}
		}
		webConfig.HealthCheck = healthCheck

		domains := make([]*porterv1.Domain, 0)
		for _, domain := range service.Domains {
			domains = append(domains, &porterv1.Domain{
				Name: domain.Name,
			})
		}
		webConfig.Domains = domains

		webConfig.IngressAnnotations = service.IngressAnnotations

		if service.Private != nil {
			webConfig.Private = service.Private
		}

		if service.DisableTLS != nil {
			webConfig.DisableTls = service.DisableTLS
		}

		serviceProto.Config = &porterv1.Service_WebConfig{
			WebConfig: webConfig,
		}
	case porterv1.ServiceType_SERVICE_TYPE_WORKER:
		workerConfig := &porterv1.WorkerServiceConfig{}

		var autoscaling *porterv1.Autoscaling
		if service.Autoscaling != nil {
			autoscaling = &porterv1.Autoscaling{
				Enabled:                service.Autoscaling.Enabled,
				MinInstances:           int32(service.Autoscaling.MinInstances),
				MaxInstances:           int32(service.Autoscaling.MaxInstances),
				CpuThresholdPercent:    int32(service.Autoscaling.CpuThresholdPercent),
				MemoryThresholdPercent: int32(service.Autoscaling.MemoryThresholdPercent),
			}
		}
		workerConfig.Autoscaling = autoscaling

		serviceProto.Config = &porterv1.Service_WorkerConfig{
			WorkerConfig: workerConfig,
		}
	case porterv1.ServiceType_SERVICE_TYPE_JOB:
		jobConfig := &porterv1.JobServiceConfig{
			AllowConcurrentOptional: service.AllowConcurrent,
			Cron:                    service.Cron,
		}
		if service.SuspendCron != nil {
			jobConfig.SuspendCron = service.SuspendCron
		}
		if service.TimeoutSeconds != 0 {
			jobConfig.TimeoutSeconds = int64(service.TimeoutSeconds)
		}

		serviceProto.Config = &porterv1.Service_JobConfig{
			JobConfig: jobConfig,
		}
	}

	return serviceProto, nil
}

// AppFromProto converts a PorterApp proto object into a PorterApp struct
func AppFromProto(appProto *porterv1.PorterApp) (PorterApp, error) {
	porterApp := PorterApp{
		Version: "v2",
		Name:    appProto.Name,
	}

	if appProto.Build != nil {
		porterApp.Build = &Build{
			Context:    appProto.Build.Context,
			Method:     appProto.Build.Method,
			Builder:    appProto.Build.Builder,
			Buildpacks: appProto.Build.Buildpacks,
			Dockerfile: appProto.Build.Dockerfile,
			CommitSHA:  appProto.Build.CommitSha,
		}
	}

	if appProto.Image != nil {
		porterApp.Image = &Image{
			Repository: appProto.Image.Repository,
			Tag:        appProto.Image.Tag,
		}
	}

	uniqueServices := uniqueServices(appProto.Services, appProto.ServiceList) // nolint:staticcheck // temporarily using deprecated field for backwards compatibility
	for _, service := range uniqueServices {
		appService, err := appServiceFromProto(service)
		if err != nil {
			return porterApp, err
		}
		porterApp.Services = append(porterApp.Services, appService)
	}

	if appProto.Predeploy != nil {
		appPredeploy, err := appServiceFromProto(appProto.Predeploy)
		if err != nil {
			return porterApp, err
		}

		porterApp.Predeploy = &appPredeploy
	}

	porterApp.EnvGroups = make([]EnvGroup, 0)
	for _, envGroup := range appProto.EnvGroups {
		porterApp.EnvGroups = append(porterApp.EnvGroups, EnvGroup{
			Name:    envGroup.Name,
			Version: int(envGroup.Version),
		})
	}

	if appProto.EfsStorage != nil {
		porterApp.EfsStorage = &EfsStorage{
			Enabled: appProto.EfsStorage.Enabled,
		}
	}

	return porterApp, nil
}

func appServiceFromProto(service *porterv1.Service) (Service, error) {
	appService := Service{
		Name:              service.Name,
		Run:               service.RunOptional,
		Instances:         service.InstancesOptional,
		CpuCores:          service.CpuCores,
		RamMegabytes:      int(service.RamMegabytes),
		GpuCoresNvidia:    service.GpuCoresNvidia, // nolint:staticcheck // https://linear.app/porter/issue/POR-2137/support-new-gpu-field-in-porteryaml
		Port:              int(service.Port),
		SmartOptimization: service.SmartOptimization,
		GPU: &GPU{
			Enabled:        service.Gpu.Enabled,
			GpuCoresNvidia: int(service.Gpu.GpuCoresNvidia),
		},
		TerminationGracePeriodSeconds: service.TerminationGracePeriodSeconds,
	}

	switch service.Type {
	default:
		return appService, fmt.Errorf("invalid service type '%s'", service.Type)
	case porterv1.ServiceType_SERVICE_TYPE_UNSPECIFIED:
		return appService, errors.New("Service type unspecified")
	case porterv1.ServiceType_SERVICE_TYPE_WEB:
		webConfig := service.GetWebConfig()
		appService.Type = "web"

		var autoscaling *AutoScaling
		if webConfig.Autoscaling != nil {
			autoscaling = &AutoScaling{
				Enabled:                webConfig.Autoscaling.Enabled,
				MinInstances:           int(webConfig.Autoscaling.MinInstances),
				MaxInstances:           int(webConfig.Autoscaling.MaxInstances),
				CpuThresholdPercent:    int(webConfig.Autoscaling.CpuThresholdPercent),
				MemoryThresholdPercent: int(webConfig.Autoscaling.MemoryThresholdPercent),
			}
		}
		appService.Autoscaling = autoscaling

		var healthCheck *HealthCheck
		if webConfig.HealthCheck != nil {
			healthCheck = &HealthCheck{
				Enabled:  webConfig.HealthCheck.Enabled,
				HttpPath: webConfig.HealthCheck.HttpPath,
			}
		}
		appService.HealthCheck = healthCheck

		domains := make([]Domains, 0)
		for _, domain := range webConfig.Domains {
			domains = append(domains, Domains{
				Name: domain.Name,
			})
		}
		appService.Domains = domains

		appService.IngressAnnotations = webConfig.IngressAnnotations

		if webConfig.Private != nil {
			appService.Private = webConfig.Private
		}

		if webConfig.DisableTls != nil {
			appService.DisableTLS = webConfig.DisableTls
		}
	case porterv1.ServiceType_SERVICE_TYPE_WORKER:
		workerConfig := service.GetWorkerConfig()
		appService.Type = "worker"

		var autoscaling *AutoScaling
		if workerConfig.Autoscaling != nil {
			autoscaling = &AutoScaling{
				Enabled:                workerConfig.Autoscaling.Enabled,
				MinInstances:           int(workerConfig.Autoscaling.MinInstances),
				MaxInstances:           int(workerConfig.Autoscaling.MaxInstances),
				CpuThresholdPercent:    int(workerConfig.Autoscaling.CpuThresholdPercent),
				MemoryThresholdPercent: int(workerConfig.Autoscaling.MemoryThresholdPercent),
			}
		}
		appService.Autoscaling = autoscaling
	case porterv1.ServiceType_SERVICE_TYPE_JOB:
		jobConfig := service.GetJobConfig()
		appService.Type = "job"

		appService.AllowConcurrent = jobConfig.AllowConcurrentOptional
		appService.Cron = jobConfig.Cron
		appService.SuspendCron = jobConfig.SuspendCron
		appService.TimeoutSeconds = int(jobConfig.TimeoutSeconds)
	}

	return appService, nil
}

func uniqueServices(serviceMap map[string]*porterv1.Service, serviceList []*porterv1.Service) []*porterv1.Service {
	if serviceList != nil {
		return serviceList
	}

	// deduplicate services by name, favoring whatever was defined first
	uniqueServices := make(map[string]*porterv1.Service)
	for name, service := range serviceMap {
		service.Name = name
		uniqueServices[service.Name] = service
	}

	mergedServiceList := make([]*porterv1.Service, 0)
	for _, service := range uniqueServices {
		mergedServiceList = append(mergedServiceList, service)
	}

	return mergedServiceList
}
