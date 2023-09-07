package v1

import (
	"context"
	"errors"
	"fmt"
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

	porterYaml := &PorterStackYAML{}
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
	var services map[string]Service
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

type PorterStackYAML struct {
	Applications map[string]*Application `yaml:"applications" validate:"required_without=Services Apps"`
	Version      *string                 `yaml:"version"`
	Build        *Build                  `yaml:"build"`
	Env          map[string]string       `yaml:"env"`
	SyncedEnv    []*SyncedEnvSection     `yaml:"synced_env"`
	Apps         map[string]Service      `yaml:"apps" validate:"required_without=Applications Services"`
	Services     map[string]Service      `yaml:"services" validate:"required_without=Applications Apps"`

	Release *Service `yaml:"release"`
}

type Application struct {
	Services map[string]Service `yaml:"services" validate:"required"`
	Build    *Build             `yaml:"build"`
	Env      map[string]string  `yaml:"env"`

	Release *Service `yaml:"release"`
}

type Build struct {
	Context    string   `yaml:"context" validate:"dir"`
	Method     string   `yaml:"method" validate:"required,oneof=pack docker registry"`
	Builder    string   `yaml:"builder" validate:"required_if=Method pack"`
	Buildpacks []string `yaml:"buildpacks"`
	Dockerfile string   `yaml:"dockerfile" validate:"required_if=Method docker"`
	Image      string   `yaml:"image" validate:"required_if=Method registry"`
}

type Service struct {
	Run    string                 `yaml:"run"`
	Config map[string]interface{} `yaml:"config"`
	Type   string                 `yaml:"type" validate:"required, oneof=web worker job"`
}

type SyncedEnvSection struct {
	Name    string                `json:"name" yaml:"name"`
	Version uint                  `json:"version" yaml:"version"`
	Keys    []SyncedEnvSectionKey `json:"keys" yaml:"keys"`
}

type SyncedEnvSectionKey struct {
	Name   string `json:"name" yaml:"name"`
	Secret bool   `json:"secret" yaml:"secret"`
}

func protoEnumFromType(name string, service Service) (porterv1.ServiceType, error) {
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

func serviceProtoFromConfig(service Service, serviceType porterv1.ServiceType) (*porterv1.Service, error) {
	if service.Config != nil {
		service.Config = convertMap(service.Config).(map[string]interface{})
	}

	var instances int
	if service.Config != nil && service.Config["replicaCount"] != nil {
		parsedInstancesInt, err := convertToInt(service.Config["replicaCount"])
		if err != nil {
			return nil, fmt.Errorf("error converting instances: %w", err)
		}
		instances = parsedInstancesInt
	}

	var cpuCores float32
	var ramMegabytes int

	requestsMap, err := getNestedMap(service.Config, "resources", "requests")
	if err == nil && requestsMap != nil {
		parsedCpuCores := requestsMap["cpu"]
		cpuCoresStr, ok := parsedCpuCores.(string)
		if !ok {
			return nil, fmt.Errorf("cpu is not a string")
		}

		if !strings.HasSuffix(cpuCoresStr, "m") {
			return nil, fmt.Errorf("cpu is not in millicores")
		}

		cpuCoresStr = strings.TrimSuffix(cpuCoresStr, "m")
		cpuCoresFloat64, err := strconv.ParseFloat(cpuCoresStr, 32)
		if err != nil {
			return nil, fmt.Errorf("cpu is not a float")
		}
		cpuCores = float32(cpuCoresFloat64) / 1000

		parsedRamMegabytes := requestsMap["memory"]
		ramMegabytesStr, ok := parsedRamMegabytes.(string)
		if !ok {
			return nil, fmt.Errorf("memory is not a string")
		}

		if !strings.HasSuffix(ramMegabytesStr, "Mi") {
			return nil, fmt.Errorf("memory is not in Mi")
		}

		ramMegabytesStr = strings.TrimSuffix(ramMegabytesStr, "Mi")
		ramMegabytesInt, err := strconv.Atoi(ramMegabytesStr)
		if err != nil {
			return nil, fmt.Errorf("memory is not an int")
		}
		ramMegabytes = ramMegabytesInt
	}

	var port int
	containerMap, err := getNestedMap(service.Config, "container")
	if err == nil && containerMap != nil {
		parsedPort := containerMap["port"]
		portStr, ok := parsedPort.(string)
		if !ok {
			return nil, fmt.Errorf("port is not a string")
		}

		portInt, err := strconv.Atoi(portStr)
		if err != nil {
			return nil, fmt.Errorf("port is not an int")
		}

		port = portInt
	}

	autoscalingMap, err := getNestedMap(service.Config, "autoscaling")
	autoscalingExists := err == nil && autoscalingMap != nil
	var autoscalingEnabled bool
	var autoscalingMinInstances int
	var autoscalingMaxInstances int
	var autoscalingCpuThresholdPercent int
	var autoscalingMemoryThresholdPercent int
	if autoscalingExists {
		parsedEnabled := autoscalingMap["enabled"]
		parsedEnabledBool, err := convertToBool(parsedEnabled)
		if err != nil {
			return nil, fmt.Errorf("error converting autoscaling enabled: %w", err)
		}
		autoscalingEnabled = parsedEnabledBool

		parsedMinInstances := autoscalingMap["minReplicas"]
		parsedMinInstancesInt, err := convertToInt(parsedMinInstances)
		if err != nil {
			return nil, fmt.Errorf("error converting autoscaling min instances: %w", err)
		}
		autoscalingMinInstances = parsedMinInstancesInt

		parsedMaxInstances := autoscalingMap["maxReplicas"]
		parsedMaxInstancesInt, err := convertToInt(parsedMaxInstances)
		if err != nil {
			return nil, fmt.Errorf("error converting autoscaling max instances: %w", err)
		}
		autoscalingMaxInstances = parsedMaxInstancesInt

		parsedCpuThresholdPercent := autoscalingMap["targetCPUUtilizationPercentage"]
		parsedCpuThresholdPercentInt, err := convertToInt(parsedCpuThresholdPercent)
		if err != nil {
			return nil, fmt.Errorf("error converting autoscaling cpu threshold percent: %w", err)
		}
		autoscalingCpuThresholdPercent = parsedCpuThresholdPercentInt

		parsedMemoryThresholdPercent := autoscalingMap["targetMemoryUtilizationPercentage"]
		parsedMemoryThresholdPercentInt, err := convertToInt(parsedMemoryThresholdPercent)
		if err != nil {
			return nil, fmt.Errorf("error converting autoscaling memory threshold percent: %w", err)
		}
		autoscalingMemoryThresholdPercent = parsedMemoryThresholdPercentInt
	}

	serviceProto := &porterv1.Service{
		Run:          service.Run,
		Type:         serviceType,
		Instances:    int32(instances),
		CpuCores:     cpuCores,
		RamMegabytes: int32(ramMegabytes),
		Port:         int32(port),
	}

	switch serviceType {
	default:
		return nil, fmt.Errorf("invalid service type '%s'", serviceType)
	case porterv1.ServiceType_SERVICE_TYPE_UNSPECIFIED:
		return nil, errors.New("Service type unspecified")
	case porterv1.ServiceType_SERVICE_TYPE_WEB:
		webConfig := &porterv1.WebServiceConfig{}

		var autoscaling *porterv1.Autoscaling
		if autoscalingExists && autoscalingEnabled {
			autoscaling = &porterv1.Autoscaling{
				Enabled:                autoscalingEnabled,
				MinInstances:           int32(autoscalingMinInstances),
				MaxInstances:           int32(autoscalingMaxInstances),
				CpuThresholdPercent:    int32(autoscalingCpuThresholdPercent),
				MemoryThresholdPercent: int32(autoscalingMemoryThresholdPercent),
			}
		}
		webConfig.Autoscaling = autoscaling

		var healthCheckEnabled bool
		var healthCheckHttpPath string

		// note that we are only reading from the readiness probe config, since readiness and liveness share the same config now
		readinessProbeMap, err := getNestedMap(service.Config, "health", "readinessProbe")
		healthCheckExists := err == nil && readinessProbeMap != nil
		if healthCheckExists {
			parsedHealthCheckEnabled := readinessProbeMap["enabled"]
			parsedHealthCheckEnabledBool, err := convertToBool(parsedHealthCheckEnabled)
			if err != nil {
				return nil, fmt.Errorf("error converting health check enabled: %w", err)
			}
			healthCheckEnabled = parsedHealthCheckEnabledBool

			parsedHealthCheckHttpPath := readinessProbeMap["path"]
			parsedHealthCheckHttpPathStr, err := convertToString(parsedHealthCheckHttpPath)
			if err != nil {
				return nil, fmt.Errorf("error converting health check http path: %w", err)
			}
			healthCheckHttpPath = parsedHealthCheckHttpPathStr
		}

		var healthCheck *porterv1.HealthCheck
		if healthCheckExists {
			healthCheck = &porterv1.HealthCheck{
				Enabled:  healthCheckEnabled,
				HttpPath: healthCheckHttpPath,
			}
		}
		webConfig.HealthCheck = healthCheck

		ingressMap, err := getNestedMap(service.Config, "ingress")
		ingressExists := err == nil && ingressMap != nil
		var ingressEnabled bool
		if ingressExists {
			parsedIngressEnabled := ingressMap["enabled"]
			parsedIngressEnabledBool, err := convertToBool(parsedIngressEnabled)
			if err != nil {
				return nil, fmt.Errorf("error converting ingress enabled: %w", err)
			}
			ingressEnabled = parsedIngressEnabledBool
		}
		webConfig.Private = !ingressEnabled

		if ingressExists && ingressEnabled {
			domains := make([]*porterv1.Domain, 0)
			customDomains := ingressMap["hosts"]
			if customDomains != nil {
				customDomainsArr, ok := customDomains.([]interface{})
				if !ok {
					return nil, fmt.Errorf("error converting custom domains to array")
				}
				for _, domain := range customDomainsArr {
					domainStr, ok := domain.(string)
					if !ok {
						return nil, fmt.Errorf("error converting custom domain to string")
					}
					domains = append(domains, &porterv1.Domain{
						Name: domainStr,
					})
				}
			}
			webConfig.Domains = domains
		}

		serviceProto.Config = &porterv1.Service_WebConfig{
			WebConfig: webConfig,
		}
	case porterv1.ServiceType_SERVICE_TYPE_WORKER:
		workerConfig := &porterv1.WorkerServiceConfig{}

		var autoscaling *porterv1.Autoscaling
		if autoscalingExists && autoscalingEnabled {
			autoscaling = &porterv1.Autoscaling{
				Enabled:                autoscalingEnabled,
				MinInstances:           int32(autoscalingMinInstances),
				MaxInstances:           int32(autoscalingMaxInstances),
				CpuThresholdPercent:    int32(autoscalingCpuThresholdPercent),
				MemoryThresholdPercent: int32(autoscalingMemoryThresholdPercent),
			}
		}
		workerConfig.Autoscaling = autoscaling

		serviceProto.Config = &porterv1.Service_WorkerConfig{
			WorkerConfig: workerConfig,
		}
	case porterv1.ServiceType_SERVICE_TYPE_JOB:
		var allowConcurrent bool
		if service.Config != nil && service.Config["allowConcurrent"] != nil {
			parsedAllowConcurrentBool, err := convertToBool(service.Config["allowConcurrent"])
			if err != nil {
				return nil, fmt.Errorf("error converting allow concurrency: %w", err)
			}
			allowConcurrent = parsedAllowConcurrentBool
		}

		var cron string
		cronScheduleMap, err := getNestedMap(service.Config, "schedule")
		if err == nil && cronScheduleMap != nil {
			parsedCron := cronScheduleMap["value"]
			parsedConString, err := convertToString(parsedCron)
			if err != nil {
				return nil, fmt.Errorf("error converting cron schedule: %w", err)
			}
			cron = parsedConString
		}

		jobConfig := &porterv1.JobServiceConfig{
			AllowConcurrent: allowConcurrent,
			Cron:            cron,
		}

		serviceProto.Config = &porterv1.Service_JobConfig{
			JobConfig: jobConfig,
		}
	}

	return serviceProto, nil
}

func getNestedMap(obj map[string]interface{}, fields ...string) (map[string]interface{}, error) {
	var res map[string]interface{}
	curr := obj

	for _, field := range fields {
		objField, ok := curr[field]

		if !ok {
			return nil, fmt.Errorf("%s does not exist in object", field)
		}

		res, ok = objField.(map[string]interface{})

		if !ok {
			return nil, fmt.Errorf("%s is not a nested object", field)
		}

		curr = res
	}

	return res, nil
}

func convertToInt(input interface{}) (int, error) {
	if input == nil {
		return 0, nil
	}

	switch value := input.(type) {
	case int:
		return value, nil
	case string:
		return strconv.Atoi(value)
	default:
		return 0, fmt.Errorf("input is not an int or string")
	}
}

func convertToBool(input interface{}) (bool, error) {
	if input == nil {
		return false, nil
	}

	switch value := input.(type) {
	case bool:
		return value, nil
	case string:
		return strconv.ParseBool(value)
	default:
		return false, fmt.Errorf("input is not a bool or string")
	}
}

func convertToString(input interface{}) (string, error) {
	if input == nil {
		return "", nil
	}

	switch value := input.(type) {
	case string:
		return value, nil
	default:
		return "", fmt.Errorf("input is not a string")
	}
}

func convertMap(m interface{}) interface{} {
	switch m := m.(type) {
	case map[string]interface{}:
		for k, v := range m {
			m[k] = convertMap(v)
		}
	case map[string]string:
		result := map[string]interface{}{}
		for k, v := range m {
			result[k] = v
		}
		return result
	case map[interface{}]interface{}:
		result := map[string]interface{}{}
		for k, v := range m {
			result[k.(string)] = convertMap(v)
		}
		return result
	case []interface{}:
		for i, v := range m {
			m[i] = convertMap(v)
		}
	}
	return m
}
