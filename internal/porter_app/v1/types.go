package v1

// ServiceConfig contains the configuration exposed to users in v1stack porter.yaml
type ServiceConfig struct {
	Autoscaling      *Autoscaling      `yaml:"autoscaling,omitempty" validate:"excluded_if=Type job"`
	Container        Container         `yaml:"container"`
	Health           *Health           `yaml:"health,omitempty" validate:"excluded_unless=Type web"`
	Ingress          *Ingress          `yaml:"ingress"`
	ReplicaCount     *string           `yaml:"replicaCount"`
	Resources        Resources         `yaml:"resources"`
	Service          KubernetesService `yaml:"service"`
	AllowConcurrency *bool             `yaml:"allowConcurrent" validate:"excluded_unless=Type job"`
	Schedule         Schedule          `yaml:"schedule" validate:"excluded_unless=Type job"`
}

// Schedule contains all configuration for job schedules
type Schedule struct {
	Enabled bool `yaml:"enabled"`
	// Value is the cron schedule
	Value string `yaml:"value,omitempty"`
}

// Autoscaling contains all configuration for autoscaling in a web/worker chart
type Autoscaling struct {
	Enabled                           bool   `yaml:"enabled"`
	MaxReplicas                       string `yaml:"maxReplicas"`
	MinReplicas                       string `yaml:"minReplicas"`
	TargetCPUUtilizationPercentage    string `yaml:"targetCPUUtilizationPercentage"`
	TargetMemoryUtilizationPercentage string `yaml:"targetMemoryUtilizationPercentage"`
}

// Container contains all configuration for containers
type Container struct {
	Port string `yaml:"port"`
}

// Health contains user-configurable health probes
type Health struct {
	// LivenessProbe checks whether a container should be considered healthy
	LivenessProbe LivenessProbe `yaml:"livenessProbe"`
	// ReadinessProbe checks whether a container should be considered ready to receive traffic
	ReadinessProbe ReadinessProbe `yaml:"readinessProbe"`
}

// LivenessProbe contains user-configurable values for a liveness probe
type LivenessProbe struct {
	Enabled bool `yaml:"enabled"`
	// Path is the endpoint path to use for the probe
	Path string `yaml:"path"`
}

// ReadinessProbe contains user-configurable values for a readiness probe
type ReadinessProbe struct {
	Enabled bool `yaml:"enabled"`
	// Path is the endpoint path to use for the probe
	Path string `yaml:"path"`
}

// Ingress contains configuration for ingress used by web charts
type Ingress struct {
	// Enabled specifies whether or not to use an ingress
	Enabled bool `yaml:"enabled"`
	// Hosts specifies the domains to include in the routing rules
	Hosts []string `yaml:"hosts"`
	// PorterHosts specifies the porter domains to include in the routing rules
	PorterHosts []string `yaml:"porter_hosts"`
	// Annotations specifies annotations to add to the ingress
	Annotations map[string]string `yaml:"annotations"`
}

// Resources is a wrapper over requests
type Resources struct {
	// Requests contains configuration for resource requests
	Requests Requests `yaml:"requests"`
}

// Requests contains configuration for resource requests
type Requests struct {
	// Cpu is the cpu request (e.g. 100m - m for millicores)
	Cpu string `yaml:"cpu"`
	// Memory is the memory request (e.g. 100Mi - Mi for mebibytes)
	Memory string `yaml:"memory"`
}

// KubernetesService contains configuration for exposing services
type KubernetesService struct {
	// Port is the port to expose the service on. This port should match the port in the container.
	Port string `yaml:"port"`
}

// PorterYAML represents the accepted top-level fields in a porter.yaml
type PorterYAML struct {
	Version  *string            `yaml:"version"`
	Build    *Build             `yaml:"build"`
	Env      map[string]string  `yaml:"env"`
	Apps     map[string]Service `yaml:"apps" validate:"required_without=Services"`
	Services map[string]Service `yaml:"services" validate:"required_without=Apps"`

	Release *Service `yaml:"release"`
}

// Build represents the build settings for a Porter app
type Build struct {
	Context    string   `yaml:"context" validate:"dir"`
	Method     string   `yaml:"method" validate:"required,oneof=pack docker registry"`
	Builder    string   `yaml:"builder" validate:"required_if=Method pack"`
	Buildpacks []string `yaml:"buildpacks"`
	Dockerfile string   `yaml:"dockerfile" validate:"required_if=Method docker"`
	Image      string   `yaml:"image" validate:"required_if=Method registry"`
}

// Service represents a service in a Porter app
type Service struct {
	Run    *string       `yaml:"run,omitempty"`
	Config ServiceConfig `yaml:"config"`
	Type   string        `yaml:"type" validate:"required, oneof=web worker job"`
}
