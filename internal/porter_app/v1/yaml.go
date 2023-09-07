package v1

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/telemetry"

	"gopkg.in/yaml.v2"
)

// AppProtoFromYaml converts an old version Porter YAML file into a PorterApp proto object
func AppProtoFromYaml(ctx context.Context, porterYamlBytes []byte) (*porterv1.PorterApp, error) {
	ctx, span := telemetry.NewSpan(ctx, "v1-app-proto-from-yaml")
	defer span.End()

	if porterYamlBytes == nil {
		return nil, telemetry.Error(ctx, span, nil, "porter yaml is nil")
	}

	porterYaml := &v1_PorterYAML{}
	err := yaml.Unmarshal(porterYamlBytes, porterYaml)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error unmarshaling porter yaml")
	}

	appProto := &porterv1.PorterApp{
		// TODO: figure out what to do about no name spec in v1
		Name: "",
		Env:  porterYaml.Env,
	}

	if porterYaml.Build != nil {
		appProto.Build = &porterv1.Build{
			Context:    porterYaml.Build.Context,
			Method:     porterYaml.Build.Method,
			Builder:    porterYaml.Build.Builder,
			Buildpacks: porterYaml.Build.Buildpacks,
			Dockerfile: porterYaml.Build.Dockerfile,
		}
	}

	if porterYaml.Build != nil && porterYaml.Build.Image != "" {
		imageSpl := strings.Split(porterYaml.Build.Image, ":")
		if len(imageSpl) == 2 {
			appProto.Image = &porterv1.AppImage{
				Repository: imageSpl[0],
				Tag:        imageSpl[1],
			}
		} else {
			return nil, telemetry.Error(ctx, span, err, "error parsing image")
		}
	}

	if porterYaml.Apps != nil && porterYaml.Services != nil {
		return nil, telemetry.Error(ctx, span, nil, "'apps' and 'services' are synonymous but both were defined")
	}
	var services map[string]v1_Service
	if porterYaml.Apps != nil {
		services = porterYaml.Apps
	}

	if porterYaml.Services != nil {
		services = porterYaml.Services
	}

	if services == nil {
		return nil, telemetry.Error(ctx, span, nil, "porter yaml is missing services")
	}

	serviceProtoMap := make(map[string]*porterv1.Service, 0)
	for name, service := range services {
		serviceType, err := protoEnumFromType(name, service)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error getting service type")
		}

		serviceProto, err := serviceProtoFromConfig(service, serviceType)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error casting service config")
		}

		serviceProtoMap[name] = serviceProto
	}
	appProto.Services = serviceProtoMap

	if porterYaml.Release != nil {
		predeployProto, err := serviceProtoFromConfig(*porterYaml.Release, porterv1.ServiceType_SERVICE_TYPE_JOB)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error casting predeploy config")
		}
		appProto.Predeploy = predeployProto
	}

	return appProto, nil
}

func protoEnumFromType(name string, service v1_Service) (porterv1.ServiceType, error) {
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

	if strings.Contains(name, "job") {
		return porterv1.ServiceType_SERVICE_TYPE_JOB, nil
	}

	if name == "release" {
		return porterv1.ServiceType_SERVICE_TYPE_JOB, nil
	}

	return serviceType, errors.New("no type provided and could not parse service type from name")
}

func serviceProtoFromConfig(service v1_Service, serviceType porterv1.ServiceType) (*porterv1.Service, error) {
	serviceProto := &porterv1.Service{
		Run:  service.Run,
		Type: serviceType,
	}

	// if the revision number cannot be converted, it will default to 0
	replicaCount, _ := strconv.Atoi(service.Config.ReplicaCount)
	if replicaCount < math.MinInt32 || replicaCount > math.MaxInt32 {
		return nil, fmt.Errorf("replica count is out of range")
	}
	// nolint:gosec
	serviceProto.Instances = int32(replicaCount)

	if service.Config.Resources.Requests.Cpu != "" {
		cpuCoresStr := service.Config.Resources.Requests.Cpu
		if !strings.HasSuffix(cpuCoresStr, "m") {
			return nil, fmt.Errorf("cpu is not in millicores")
		}

		cpuCoresStr = strings.TrimSuffix(cpuCoresStr, "m")
		cpuCoresFloat64, err := strconv.ParseFloat(cpuCoresStr, 32)
		if err != nil {
			return nil, fmt.Errorf("cpu is not a float")
		}
		serviceProto.CpuCores = float32(cpuCoresFloat64) / 1000
	}

	if service.Config.Resources.Requests.Memory != "" {
		memoryStr := service.Config.Resources.Requests.Memory
		if !strings.HasSuffix(memoryStr, "Mi") {
			return nil, fmt.Errorf("memory is not in Mi")
		}

		memoryStr = strings.TrimSuffix(memoryStr, "Mi")
		memoryFloat64, err := strconv.ParseFloat(memoryStr, 32)
		if err != nil {
			return nil, fmt.Errorf("memory is not a float")
		}
		serviceProto.RamMegabytes = int32(memoryFloat64)
	}

	if service.Config.Container.Port != "" {
		port, err := strconv.Atoi(service.Config.Container.Port)
		if err != nil {
			return nil, fmt.Errorf("invalid port '%s'", service.Config.Container.Port)
		}
		if port < math.MinInt32 || port > math.MaxInt32 {
			return nil, fmt.Errorf("port is out of range")
		}
		serviceProto.Port = int32(port)
	}

	switch serviceType {
	default:
		return nil, fmt.Errorf("invalid service type '%s'", serviceType)
	case porterv1.ServiceType_SERVICE_TYPE_UNSPECIFIED:
		return nil, errors.New("Service type unspecified")
	case porterv1.ServiceType_SERVICE_TYPE_WEB:
		webConfig := &porterv1.WebServiceConfig{}

		var autoscaling *porterv1.Autoscaling
		if service.Config.Autoscaling != nil && service.Config.Autoscaling.Enabled {
			autoscaling = &porterv1.Autoscaling{
				Enabled: service.Config.Autoscaling.Enabled,
			}
			minReplicas, _ := strconv.Atoi(service.Config.Autoscaling.MinReplicas)
			if minReplicas < math.MinInt32 || minReplicas > math.MaxInt32 {
				return nil, fmt.Errorf("minReplicas is out of range")
			}
			// nolint:gosec
			autoscaling.MinInstances = int32(minReplicas)
			maxReplicas, _ := strconv.Atoi(service.Config.Autoscaling.MaxReplicas)
			if maxReplicas < math.MinInt32 || maxReplicas > math.MaxInt32 {
				return nil, fmt.Errorf("maxReplicas is out of range")
			}
			// nolint:gosec
			autoscaling.MaxInstances = int32(maxReplicas)
			cpuThresholdPercent, _ := strconv.Atoi(service.Config.Autoscaling.TargetCPUUtilizationPercentage)
			if cpuThresholdPercent < math.MinInt32 || cpuThresholdPercent > math.MaxInt32 {
				return nil, fmt.Errorf("cpuThresholdPercent is out of range")
			}
			// nolint:gosec
			autoscaling.CpuThresholdPercent = int32(cpuThresholdPercent)
			memoryThresholdPercent, _ := strconv.Atoi(service.Config.Autoscaling.TargetMemoryUtilizationPercentage)
			if memoryThresholdPercent < math.MinInt32 || memoryThresholdPercent > math.MaxInt32 {
				return nil, fmt.Errorf("memoryThresholdPercent is out of range")
			}
			// nolint:gosec
			autoscaling.MemoryThresholdPercent = int32(memoryThresholdPercent)
		}
		webConfig.Autoscaling = autoscaling

		var healthCheck *porterv1.HealthCheck
		// note that we are only reading from the readiness probe config, since readiness and liveness share the same config now
		if service.Config.Health != nil {
			healthCheck = &porterv1.HealthCheck{
				Enabled:  service.Config.Health.ReadinessProbe.Enabled,
				HttpPath: service.Config.Health.ReadinessProbe.Path,
			}
		}
		webConfig.HealthCheck = healthCheck

		domains := make([]*porterv1.Domain, 0)
		for _, domain := range service.Config.Ingress.Hosts {
			hostName := domain
			domains = append(domains, &porterv1.Domain{
				Name: hostName,
			})
		}
		webConfig.Domains = domains
		webConfig.Private = !service.Config.Ingress.Enabled

		serviceProto.Config = &porterv1.Service_WebConfig{
			WebConfig: webConfig,
		}
	case porterv1.ServiceType_SERVICE_TYPE_WORKER:
		workerConfig := &porterv1.WorkerServiceConfig{}

		var autoscaling *porterv1.Autoscaling
		if service.Config.Autoscaling != nil && service.Config.Autoscaling.Enabled {
			autoscaling = &porterv1.Autoscaling{
				Enabled: service.Config.Autoscaling.Enabled,
			}
			minReplicas, _ := strconv.Atoi(service.Config.Autoscaling.MinReplicas)
			if minReplicas < math.MinInt32 || minReplicas > math.MaxInt32 {
				return nil, fmt.Errorf("minReplicas is out of range")
			}
			// nolint:gosec
			autoscaling.MinInstances = int32(minReplicas)
			maxReplicas, _ := strconv.Atoi(service.Config.Autoscaling.MaxReplicas)
			if maxReplicas < math.MinInt32 || maxReplicas > math.MaxInt32 {
				return nil, fmt.Errorf("maxReplicas is out of range")
			}
			// nolint:gosec
			autoscaling.MaxInstances = int32(maxReplicas)
			cpuThresholdPercent, _ := strconv.Atoi(service.Config.Autoscaling.TargetCPUUtilizationPercentage)
			if cpuThresholdPercent < math.MinInt32 || cpuThresholdPercent > math.MaxInt32 {
				return nil, fmt.Errorf("cpuThresholdPercent is out of range")
			}
			// nolint:gosec
			autoscaling.CpuThresholdPercent = int32(cpuThresholdPercent)
			memoryThresholdPercent, _ := strconv.Atoi(service.Config.Autoscaling.TargetMemoryUtilizationPercentage)
			if memoryThresholdPercent < math.MinInt32 || memoryThresholdPercent > math.MaxInt32 {
				return nil, fmt.Errorf("memoryThresholdPercent is out of range")
			}
			// nolint:gosec
			autoscaling.MemoryThresholdPercent = int32(memoryThresholdPercent)
		}
		workerConfig.Autoscaling = autoscaling

		serviceProto.Config = &porterv1.Service_WorkerConfig{
			WorkerConfig: workerConfig,
		}
	case porterv1.ServiceType_SERVICE_TYPE_JOB:
		jobConfig := &porterv1.JobServiceConfig{
			AllowConcurrent: service.Config.AllowConcurrency,
			Cron:            service.Config.Schedule.Value,
		}

		serviceProto.Config = &porterv1.Service_JobConfig{
			JobConfig: jobConfig,
		}
	}

	return serviceProto, nil
}
