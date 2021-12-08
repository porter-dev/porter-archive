package types

type Environment struct {
	ID                uint `json:"id"`
	ProjectID         uint `json:"project_id"`
	ClusterID         uint `json:"cluster_id"`
	GitInstallationID uint `json:"git_installation_id"`

	Name string `json:"name"`
}

type CreateEnvironmentRequest struct {
	Name string `json:"name" form:"required"`
}

type Deployment struct {
	ID            uint   `json:"id"`
	EnvironmentID uint   `json:"environment_id"`
	Namespace     string `json:"namespace"`
	Status        string `json:"status"`
	Subdomain     string `json:"subdomain"`
}

type CreateDeploymentRequest struct {
	Namespace string `json:"namespace" form:"required"`
}

type FinalizeDeploymentRequest struct {
	Namespace string `json:"namespace" form:"required"`
	Subdomain string `json:"subdomain"`
}
