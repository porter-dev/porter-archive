package types

type Database struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The infra id, if cluster was provisioned with Porter
	InfraID uint `json:"infra_id"`

	ClusterID uint `json:"cluster_id"`

	InstanceID       string `json:"instance_id"`
	InstanceEndpoint string `json:"instance_endpoint"`
	InstanceName     string `json:"instance_name"`

	Status string `json:"status"`
}

type ListDatabaseResponse []*Database
