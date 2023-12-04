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
func AppProtoFromYaml(ctx context.Context, porterYamlBytes []byte) (*porterv1.PorterApp, map[string]string, error) {
	ctx, span := telemetry.NewSpan(ctx, "v1-app-proto-from-yaml")
	defer span.End()

	if porterYamlBytes == nil {
		return nil, nil, telemetry.Error(ctx, span, nil, "porter yaml is nil")
	}

	porterYaml := &PorterYAML{}
	err := yaml.Unmarshal(porterYamlBytes, porterYaml)
	if err != nil {
		return nil, nil, telemetry.Error(ctx, span, err, "error unmarshaling porter yaml")
	}

	appProto := &porterv1.PorterApp{}

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
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "image", Value: porterYaml.Build.Image})
			return nil, nil, telemetry.Error(ctx, span, err, "error parsing image")
		}
	}

	if porterYaml.Apps != nil && porterYaml.Services != nil {
		return nil, nil, telemetry.Error(ctx, span, nil, "'apps' and 'services' are synonymous but both were defined")
	}
	var services map[string]Service
	if porterYaml.Apps != nil {
		services = porterYaml.Apps
	}

	if porterYaml.Services != nil {
		services = porterYaml.Services
	}

	if services == nil {
		return nil, nil, telemetry.Error(ctx, span, nil, "porter yaml is missing services")
	}

	// service map is only needed for backwards compatibility at this time
	serviceMap := make(map[string]*porterv1.Service)
	var serviceList []*porterv1.Service

	for name, service := range services {
		serviceType := protoEnumFromType(name, service)

		serviceProto, err := serviceProtoFromConfig(service, serviceType)
		if err != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "failing-service-name", Value: name})
			return nil, nil, telemetry.Error(ctx, span, err, "error casting service config")
		}
		serviceProto.Name = name

		serviceList = append(serviceList, serviceProto)
		serviceMap[name] = serviceProto
	}
	appProto.ServiceList = serviceList
	appProto.Services = serviceMap // nolint:staticcheck // temporarily using deprecated field for backwards compatibility

	if porterYaml.Release != nil {
		predeployProto, err := serviceProtoFromConfig(*porterYaml.Release, porterv1.ServiceType_SERVICE_TYPE_JOB)
		if err != nil {
			return nil, nil, telemetry.Error(ctx, span, err, "error casting predeploy config")
		}
		appProto.Predeploy = predeployProto
	}

	return appProto, porterYaml.Env, nil
}

func protoEnumFromType(name string, service Service) porterv1.ServiceType {
	serviceType := porterv1.ServiceType_SERVICE_TYPE_UNSPECIFIED

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
		RunOptional: service.Run,
		Type:        serviceType,
	}

	if service.Config.ReplicaCount != nil {
		// if the revision number cannot be converted, it will default to 0
		replicaCount, _ := strconv.Atoi(*service.Config.ReplicaCount)
		if replicaCount < math.MinInt32 || replicaCount > math.MaxInt32 {
			return nil, fmt.Errorf("replica count is out of range of int32")
		}
		// nolint:gosec
		int32Value := int32(replicaCount)
		serviceProto.InstancesOptional = &int32Value
	}

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
		// nolint:gosec
		serviceProto.RamMegabytes = int32(memoryFloat64)
	}

	if service.Config.Container.Port != "" && service.Config.Service.Port != "" && service.Config.Container.Port != service.Config.Service.Port {
		return nil, errors.New("container port and service port do not match")
	}
	if service.Config.Container.Port != "" {
		port, err := strconv.Atoi(service.Config.Container.Port)
		if err != nil {
			return nil, fmt.Errorf("container port cannot be converted to int: %w", err)
		}
		if port < math.MinInt32 || port > math.MaxInt32 {
			return nil, fmt.Errorf("port is out of range of int32")
		}
		// nolint:gosec
		serviceProto.Port = int32(port)
	}
	if service.Config.Service.Port != "" {
		port, err := strconv.Atoi(service.Config.Service.Port)
		if err != nil {
			return nil, fmt.Errorf("service port cannot be converted to int: %w", err)
		}
		if port < math.MinInt32 || port > math.MaxInt32 {
			return nil, fmt.Errorf("port is out of range of int32")
		}
		// nolint:gosec
		serviceProto.Port = int32(port)
	}

	switch serviceType {
	default:
		return nil, fmt.Errorf("invalid service type '%s'", serviceType)
	case porterv1.ServiceType_SERVICE_TYPE_UNSPECIFIED:
		return nil, errors.New("KubernetesService type unspecified")
	case porterv1.ServiceType_SERVICE_TYPE_WEB:
		webConfig, err := webConfigProtoFromConfig(service)
		if err != nil {
			return nil, fmt.Errorf("error converting web config: %w", err)
		}

		serviceProto.Config = &porterv1.Service_WebConfig{
			WebConfig: webConfig,
		}
	case porterv1.ServiceType_SERVICE_TYPE_WORKER:
		workerConfig, err := workerConfigProtoFromConfig(service)
		if err != nil {
			return nil, fmt.Errorf("error converting worker config: %w", err)
		}

		serviceProto.Config = &porterv1.Service_WorkerConfig{
			WorkerConfig: workerConfig,
		}
	case porterv1.ServiceType_SERVICE_TYPE_JOB:
		jobConfig := &porterv1.JobServiceConfig{
			AllowConcurrentOptional: service.Config.AllowConcurrency,
			Cron:                    service.Config.Schedule.Value,
		}

		serviceProto.Config = &porterv1.Service_JobConfig{
			JobConfig: jobConfig,
		}
	}

	return serviceProto, nil
}

func workerConfigProtoFromConfig(service Service) (*porterv1.WorkerServiceConfig, error) {
	workerConfig := &porterv1.WorkerServiceConfig{}

	var autoscaling *porterv1.Autoscaling
	if service.Config.Autoscaling != nil && service.Config.Autoscaling.Enabled {
		autoscaling = &porterv1.Autoscaling{
			Enabled: service.Config.Autoscaling.Enabled,
		}
		minReplicas, _ := strconv.Atoi(service.Config.Autoscaling.MinReplicas)
		if minReplicas < math.MinInt32 || minReplicas > math.MaxInt32 {
			return nil, fmt.Errorf("minReplicas is out of range of int32")
		}
		// nolint:gosec
		autoscaling.MinInstances = int32(minReplicas)
		maxReplicas, _ := strconv.Atoi(service.Config.Autoscaling.MaxReplicas)
		if maxReplicas < math.MinInt32 || maxReplicas > math.MaxInt32 {
			return nil, fmt.Errorf("maxReplicas is out of range of int32")
		}
		// nolint:gosec
		autoscaling.MaxInstances = int32(maxReplicas)
		cpuThresholdPercent, _ := strconv.Atoi(service.Config.Autoscaling.TargetCPUUtilizationPercentage)
		if cpuThresholdPercent < math.MinInt32 || cpuThresholdPercent > math.MaxInt32 {
			return nil, fmt.Errorf("cpuThresholdPercent is out of range of int32")
		}
		// nolint:gosec
		autoscaling.CpuThresholdPercent = int32(cpuThresholdPercent)
		memoryThresholdPercent, _ := strconv.Atoi(service.Config.Autoscaling.TargetMemoryUtilizationPercentage)
		if memoryThresholdPercent < math.MinInt32 || memoryThresholdPercent > math.MaxInt32 {
			return nil, fmt.Errorf("memoryThresholdPercent is out of range of int32")
		}
		// nolint:gosec
		autoscaling.MemoryThresholdPercent = int32(memoryThresholdPercent)
	}
	workerConfig.Autoscaling = autoscaling

	return workerConfig, nil
}

func webConfigProtoFromConfig(service Service) (*porterv1.WebServiceConfig, error) {
	webConfig := &porterv1.WebServiceConfig{}

	var autoscaling *porterv1.Autoscaling
	if service.Config.Autoscaling != nil && service.Config.Autoscaling.Enabled {
		autoscaling = &porterv1.Autoscaling{
			Enabled: service.Config.Autoscaling.Enabled,
		}
		minReplicas, _ := strconv.Atoi(service.Config.Autoscaling.MinReplicas)
		if minReplicas < math.MinInt32 || minReplicas > math.MaxInt32 {
			return nil, errors.New("minReplicas is out of range of int32")
		}
		// nolint:gosec
		autoscaling.MinInstances = int32(minReplicas)
		maxReplicas, _ := strconv.Atoi(service.Config.Autoscaling.MaxReplicas)
		if maxReplicas < math.MinInt32 || maxReplicas > math.MaxInt32 {
			return nil, errors.New("maxReplicas is out of range of int32")
		}
		// nolint:gosec
		autoscaling.MaxInstances = int32(maxReplicas)
		cpuThresholdPercent, _ := strconv.Atoi(service.Config.Autoscaling.TargetCPUUtilizationPercentage)
		if cpuThresholdPercent < math.MinInt32 || cpuThresholdPercent > math.MaxInt32 {
			return nil, fmt.Errorf("cpuThresholdPercent is out of range of int32")
		}
		// nolint:gosec
		autoscaling.CpuThresholdPercent = int32(cpuThresholdPercent)
		memoryThresholdPercent, _ := strconv.Atoi(service.Config.Autoscaling.TargetMemoryUtilizationPercentage)
		if memoryThresholdPercent < math.MinInt32 || memoryThresholdPercent > math.MaxInt32 {
			return nil, fmt.Errorf("memoryThresholdPercent is out of range of int32")
		}
		// nolint:gosec
		autoscaling.MemoryThresholdPercent = int32(memoryThresholdPercent)
	}
	webConfig.Autoscaling = autoscaling

	var healthCheck *porterv1.HealthCheck
	// note that we are only reading from the readiness probe config, since readiness and liveness share the same config now
	if service.Config.Health != nil {
		health := service.Config.Health
		if health.ReadinessProbe.Enabled && health.LivenessProbe.Enabled && health.ReadinessProbe.Path != health.LivenessProbe.Path {
			return nil, errors.New("liveness and readiness probes must have the same path")
		}
		if health.ReadinessProbe.Enabled {
			healthCheck = &porterv1.HealthCheck{
				Enabled:  service.Config.Health.ReadinessProbe.Enabled,
				HttpPath: service.Config.Health.ReadinessProbe.Path,
			}
		} else if health.LivenessProbe.Enabled {
			healthCheck = &porterv1.HealthCheck{
				Enabled:  service.Config.Health.LivenessProbe.Enabled,
				HttpPath: service.Config.Health.LivenessProbe.Path,
			}
		}
	}

	webConfig.HealthCheck = healthCheck

	if service.Config.Ingress != nil {
		domains := make([]*porterv1.Domain, 0)
		for _, domain := range service.Config.Ingress.Hosts {
			hostName := domain
			domains = append(domains, &porterv1.Domain{
				Name: hostName,
			})
		}
		for _, domain := range service.Config.Ingress.PorterHosts {
			hostName := domain
			domains = append(domains, &porterv1.Domain{
				Name: hostName,
			})
		}
		if service.Config.Ingress.Annotations != nil && len(service.Config.Ingress.Annotations) > 0 {
			return nil, errors.New("annotations are not supported")
		}
		webConfig.Domains = domains

		private := !service.Config.Ingress.Enabled
		webConfig.Private = &private
	}

	return webConfig, nil
}
