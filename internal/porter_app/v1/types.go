package v1

type v1_ServiceConfig struct {
	// Autoscaling contains all configuration for autoscaling.  If enabled, ReplicaCount is ignored.
	Autoscaling *Autoscaling `yaml:"autoscaling,omitempty" validate:"excluded_if=Type job"`
	// Container contains configuration for Kubernetes container spec
	Container Container `yaml:"container"`
	// Health contains configuration for Kubernetes health probes
	Health *Health `yaml:"health,omitempty" validate:"excluded_unless=Type web"`
	// Ingress contains all configuration for ingress
	Ingress Ingress `yaml:"ingress"`
	// ReplicaCount is the number of replicas to run. Ignored if Autoscaling is enabled.
	ReplicaCount string `yaml:"replicaCount"`
	// Resources contains all configuration for resources requests
	Resources Resources `yaml:"resources"`
	// Service contains all configuration for the Kubernetes Service associated with the chart
	Service Service `yaml:"service"`
	// Labels contains all the labels to be included in controller specs
	Labels map[string]string `yaml:"labels"`
	// PodLabels contains all the labels to be included in pod specs
	PodLabels map[string]string `yaml:"podLabels"`
	// AllowConcurrent allows multiple instances of the job to run at the same time
	AllowConcurrency bool `yaml:"allowConcurrent" validate:"excluded_unless=Type job"`
	// Schedule is the cron schedule for the job
	Schedule Schedule `yaml:"schedule" validate:"excluded_unless=Type job"`
}

// Schedule contains all configuration for job schedules
type Schedule struct {
	// Enabled specifies whether or not to use a schedule
	Enabled bool `yaml:"enabled"`
	// Value is the cron schedule
	Value string `yaml:"value,omitempty"`
}

// Autoscaling contains all configuration for autoscaling in a web/worker chart.  If enabled, ReplicaCount is ignored.
type Autoscaling struct {
	// Enabled specifies whether or not to use autoscaling
	Enabled bool `yaml:"enabled"`
	// MaxReplicas is the maximum number of replicas to scale to
	MaxReplicas string `yaml:"maxReplicas"`
	// MinReplicas is the minimum number of replicas to scale to
	MinReplicas string `yaml:"minReplicas"`
	// TargetCPUUtilizationPercentage is the target CPU utilization percentage to scale on
	TargetCPUUtilizationPercentage string `yaml:"targetCPUUtilizationPercentage"`
	// TargetMemoryUtilizationPercentage is the target memory utilization percentage to scale on
	TargetMemoryUtilizationPercentage string `yaml:"targetMemoryUtilizationPercentage"`
}

// Container contains all configuration for containers
type Container struct {
	// Command is the command to run in the container
	Command string `yaml:"command"`
	// Env contains the environment variables for the container
	Env ContainerEnv `yaml:"env"`
	// Port is the port that the container exposes
	Port string `yaml:"port"`
}

// ContainerEnv represents the environment variables for a container
type ContainerEnv struct {
	// Normal represents the service-specific environment variables (as opposed to environment variables from synced env groups)
	Normal map[string]string `yaml:"normal"`
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
	// Enabled specifies whether or not to use a liveness probe
	Enabled bool `yaml:"enabled"`
	// Path is the endpoint path to use for the probe
	Path string `yaml:"path"`
}

// ReadinessProbe contains user-configurable values for a readiness probe
type ReadinessProbe struct {
	// Enabled specifies whether or not to use a readiness probe
	Enabled bool `yaml:"enabled"`
	// Path is the endpoint path to use for the probe
	Path string `yaml:"path"`
}

// Image contains configuration for images
type Image struct {
	// Repository is url of the image repository where the image should be pulled from
	Repository string `yaml:"repository"`
	// Tag is the tag of the image to pull
	Tag string `yaml:"tag"`
}

// Ingress contains configuration for ingress used by web charts
type Ingress struct {
	// Enabled specifies whether or not to use an ingress
	Enabled bool `yaml:"enabled"`
	// Hosts specifies the domains to include in the routing rules. If Ingress is enabled, hosts must not be empty.
	Hosts []string `yaml:"hosts"`
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

// Service contains configuration for exposing services
type Service struct {
	// Port is the port to expose the service on. This port should match the port in the container.
	Port string `yaml:"port"`
}

type v1_PorterYAML struct {
	Version  *string               `yaml:"version"`
	Build    *Build                `yaml:"build"`
	Env      map[string]string     `yaml:"env"`
	Apps     map[string]v1_Service `yaml:"apps" validate:"required_without=Applications Services"`
	Services map[string]v1_Service `yaml:"services" validate:"required_without=Applications Apps"`

	Release *v1_Service `yaml:"release"`
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

type v1_Service struct {
	Run    string           `yaml:"run"`
	Config v1_ServiceConfig `yaml:"config"`
	Type   string           `yaml:"type" validate:"required, oneof=web worker job"`
}
