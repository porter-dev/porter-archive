package types

type EnvironmentConfig struct {
	ID                uint `json:"id"`
	ProjectID         uint `json:"project_id"`
	ClusterID         uint `json:"cluster_id"`
	GitInstallationID uint `json:"git_installation_id"`

	Name string `json:"string"`
	Auto bool   `json:"auto"`
}
