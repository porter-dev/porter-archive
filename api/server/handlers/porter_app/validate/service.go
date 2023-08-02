package validate

import (
	"fmt"
	"strings"
)

type RequestResources struct {
	cpu    string
	memory string
}

type Resources struct {
	requests RequestResources
}

type Container struct {
	command string
	port    string
}

type ServiceDef struct {
	port string
}

type Ingress struct {
	enabled       bool
	custom_domain bool
	hosts         []string
	porter_hosts  []string
	annotations   map[string]string
}

type HealthProbe struct {
	enabled          bool
	failureThreshold int
	path             string
	periodSeconds    int
}

type HealthChecks struct {
	startupProbe   HealthProbe
	livenessProbe  HealthProbe
	readinessProbe HealthProbe
}

type AutoScaling struct {
	enabled                           bool
	minReplicas                       int
	maxReplicas                       int
	targetCPUUtilizationPercentage    int
	targetMemoryUtilizationPercentage int
}

type CloudSql struct {
	enabled            bool
	connectionName     string
	dbPort             int
	serviceAccountJSON string
}

type JobSchedule struct {
	enabled bool
	value   string
}

type WebServiceConfig struct {
	replicaCount *string
	resources    *Resources
	container    *Container
	autoscaling  *AutoScaling
	ingress      *Ingress
	service      *ServiceDef
	health       *HealthChecks
	cloudsql     *CloudSql
}

type WorkerServiceConfig struct {
	replicaCount *string
	container    *Container
	resources    *Resources
	autoscaling  *AutoScaling
	cloudsql     *CloudSql
}

type JobServiceConfig struct {
	allowConcurrent *bool
	container       *Container
	resources       *Resources
	schedule        *JobSchedule
	paused          *bool
	cloudsql        *CloudSql
}

func getType(name string, service Service) string {
	if service.Type != "" {
		return service.Type
	}
	if strings.Contains(name, "web") {
		return "web"
	}

	if strings.Contains(name, "wkr") {
		return "worker"
	}

	return "job"
}

func HydrateService(current Service, previous Service, name string) (Service, error) {
	service := Service{}
	serviceType := getType(name, current)

	switch serviceType {
	case "web":
		service, err := hydrateWebService(current, previous)
		if err != nil {
			return service, err
		}
	case "worker":
		service, err := hydrateWorkerService(current, previous)
		if err != nil {
			return service, err
		}
	case "job":
		service, err := hydrateJobService(current, previous)
		if err != nil {
			return service, err
		}
	}

	return service, nil
}

func hydrateWebService(current, previous Service) (Service, error) {
	service := Service{
		Type: "web",
		Run: previous.Run,
	}

	if current.Run != "" {
		service.Run = current.Run
	}

	validatedConfig := WebServiceConfig{}

	currentConfig := WebServiceConfig{}
	// check if current.Config exists
	if current.Config != nil {
		// cast current.Config to WebServiceConfig
		config, ok := current.Config.(WebServiceConfig)
		if !ok {
			return service, fmt.Errorf("unable to cast current service config to web service config")
		}
		currentConfig = config
	}

	previousConfig := WebServiceConfig{}
	// check if previous.Config exists
	if previous.Config != nil {
		// cast previous.Config to WebServiceConfig
		config, ok := previous.Config.(WebServiceConfig)
		if !ok {
			return service, fmt.Errorf("unable to cast existing service config to web service config")
		}
		previousConfig = config
	}

	container, err := validateContainer(currentConfig.container, previousConfig.container)
	if err != nil {
		return service, fmt.Errorf("unable to validate container for web service: %w", err)
	}
	validatedConfig.container = container

	resources, err := validateResources(currentConfig.resources, previousConfig.resources)
	if err != nil {
		return service, fmt.Errorf("unable to validate resources for web service: %w", err)
	}
	validatedConfig.resources = resources

	autoScaling, err := validateAutoScaling(currentConfig.autoscaling, previousConfig.autoscaling)
	if err != nil {
		return service, fmt.Errorf("unable to validate autoscaling for web service: %w", err)
	}
	validatedConfig.autoscaling = autoScaling

	ingress, err := validateIngress(currentConfig.ingress, previousConfig.ingress)
	if err != nil {
		return service, fmt.Errorf("unable to validate ingress for web service: %w", err)
	}
	validatedConfig.ingress = ingress

	serviceDef, err := validateService(currentConfig.service, previousConfig.service)
	if err != nil {
		return service, fmt.Errorf("unable to validate service for web service: %w", err)
	}
	validatedConfig.service = serviceDef

	fmt.Printf("validatedConfig: %+v\n", validatedConfig)

	service.Config = validatedConfig

	return service, nil
}

func hydrateWorkerService(current, previous Service) (Service, error) {
	service := Service{
		Type: "worker",
		Run: previous.Run,
	}

	if current.Run != "" {
		service.Run = current.Run
	}

	validatedConfig := WorkerServiceConfig{}

	currentConfig := WorkerServiceConfig{}
	// check if current.Config exists
	if current.Config != nil {
		// cast current.Config to WorkerServiceConfig
		config, ok := current.Config.(WorkerServiceConfig)
		if !ok {
			return service, fmt.Errorf("unable to cast current config to worker service config")
		}
		currentConfig = config
	}

	previousConfig := WorkerServiceConfig{}
	// check if previous.Config exists
	if previous.Config != nil {
		// cast previous.Config to WorkerServiceConfig
		config, ok := previous.Config.(WorkerServiceConfig)
		if !ok {
			return service, fmt.Errorf("unable to cast previous config to worker service config")
		}
		previousConfig = config
	}

	container, err := validateContainer(currentConfig.container, previousConfig.container)
	if err != nil {
		return service, fmt.Errorf("unable to validate container for worker service: %w", err)
	}
	validatedConfig.container = container

	resources, err := validateResources(currentConfig.resources, previousConfig.resources)
	if err != nil {
		return service, fmt.Errorf("unable to validate resources for worker service: %w", err)
	}
	validatedConfig.resources = resources

	autoScaling, err := validateAutoScaling(currentConfig.autoscaling, previousConfig.autoscaling)
	if err != nil {
		return service, fmt.Errorf("unable to validate autoscaling for worker service: %w", err)
	}
	validatedConfig.autoscaling = autoScaling

	cloudsql, err := validateCloudSql(currentConfig.cloudsql, previousConfig.cloudsql)
	if err != nil {
		return service, fmt.Errorf("unable to validate cloudsql for worker service: %w", err)
	}
	validatedConfig.cloudsql = cloudsql

	service.Config = validatedConfig

	return service, nil
}

func hydrateJobService(current, previous Service) (Service, error) {
	service := Service{}

	return service, nil
}

func validateContainer(current, previous *Container) (*Container, error) {
	container := &Container{
		command: "",
		port:    "80",
	}

	if previous != nil {
		container = previous
	}

	// merge current into container
	if current != nil {
		if current.command != "" {
			container.command = current.command
		}

		if current.port != "" {
			container.port = current.port
		}
	}

	return container, nil
}

func validateResources(current, previous *Resources) (*Resources, error) {
	resources := &Resources{
		requests: RequestResources{
			cpu:    "100m",
			memory: "256Mi",
		},
	}

	if previous != nil {
		resources = previous
	}

	// merge current into resources
	if current != nil {
		if current.requests.cpu != "" {
			resources.requests.cpu = current.requests.cpu
		}

		if current.requests.memory != "" {
			resources.requests.memory = current.requests.memory
		}
	}

	return resources, nil
}

func validateAutoScaling(current, previous *AutoScaling) (*AutoScaling, error) {
	autoScaling := &AutoScaling{
		enabled:                           false,
		minReplicas:                       1,
		maxReplicas:                       10,
		targetCPUUtilizationPercentage:    50,
		targetMemoryUtilizationPercentage: 50,
	}

	if previous != nil {
		autoScaling = previous
	}

	// merge current into autoScaling
	if current != nil {
		if current.enabled {
			autoScaling.enabled = current.enabled
		}

		if current.minReplicas != 0 {
			autoScaling.minReplicas = current.minReplicas
		}

		if current.maxReplicas != 0 {
			autoScaling.maxReplicas = current.maxReplicas
		}

		if current.targetCPUUtilizationPercentage != 0 {
			autoScaling.targetCPUUtilizationPercentage = current.targetCPUUtilizationPercentage
		}

		if current.targetMemoryUtilizationPercentage != 0 {
			autoScaling.targetMemoryUtilizationPercentage = current.targetMemoryUtilizationPercentage
		}
	}

	return autoScaling, nil
}

func validateIngress(current, previous *Ingress) (*Ingress, error) {
	ingress := &Ingress{
		enabled:       false,
		custom_domain: false,
		hosts:         []string{},
		porter_hosts:  []string{},
		annotations:   map[string]string{},
	}

	if previous != nil {
		ingress = previous
	}

	// merge current into ingress
	if current != nil {
		if current.enabled {
			ingress.enabled = current.enabled
		}

		if current.custom_domain {
			ingress.custom_domain = current.custom_domain
		}

		if len(current.hosts) > 0 {
			ingress.hosts = current.hosts
		}

		if len(current.porter_hosts) > 0 {
			ingress.porter_hosts = current.porter_hosts
		}

		if len(current.annotations) > 0 {
			ingress.annotations = current.annotations
		}
	}

	return ingress, nil
}

func validateService(current, previous *ServiceDef) (*ServiceDef, error) {
	service := &ServiceDef{
		port: "80",
	}

	if previous != nil {
		service = previous
	}

	// merge current into service
	if current != nil {
		if current.port != "" {
			service.port = current.port
		}
	}

	return service, nil
}

func validateCloudSql(current, previous *CloudSql) (*CloudSql, error) {
	cloudsql := &CloudSql{
		enabled:            false,
		connectionName:     "",
		dbPort:             5432,
		serviceAccountJSON: "",
	}

	if previous != nil {
		cloudsql = previous
	}

	// merge current into cloudsql
	if current != nil {
		if current.enabled {
			cloudsql.enabled = current.enabled
		}

		if current.connectionName != "" {
			cloudsql.connectionName = current.connectionName
		}

		if current.dbPort != 0 {
			cloudsql.dbPort = current.dbPort
		}

		if current.serviceAccountJSON != "" {
			cloudsql.serviceAccountJSON = current.serviceAccountJSON
		}
	}
	return cloudsql, nil
}
