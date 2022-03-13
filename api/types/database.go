package types

type Database struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The infra id, if cluster was provisioned with Porter
	InfraID uint `json:"infra_id"`

	ClusterID uint `json:"cluster_id"`

	InstanceID        string `json:"instance_id"`
	InstanceEndpoint  string `json:"instance_endpoint"`
	InstanceName      string `json:"instance_name"`
	InstanceStatus    string `json:"instance_status"`
	InstanceDBFamily  string `json:"instance_db_family"`
	InstanceDBVersion string `json:"instance_db_version"`
	Status            string `json:"status"`
}

type ListDatabaseResponse []*Database

type UpdateDatabaseStatusRequest struct {
	Status string `json:"status" form:"required,oneof=destroying updating"`
}
