package types

type EnvironmentConfig struct {
	ID                uint `json:"id"`
	ProjectID         uint `json:"project_id"`
	ClusterID         uint `json:"cluster_id"`
	GitInstallationID uint `json:"git_installation_id"`

	Name string `json:"string"`
	Auto bool   `json:"auto"`
}

type CreatePreviewEnvironmentRequest struct {
	EnvironmentConfigID uint   `json:"environment_config_id"`
	GitRepoOwner        string `json:"git_repo_owner"`
	GitRepoName         string `json:"git_repo_name"`
	Branch              string `json:"branch"`
}

type PreviewEnvironment struct {
	ID           uint   `json:"id"`
	GitRepoOwner string `json:"git_repo_owner"`
	GitRepoName  string `json:"git_repo_name"`
	Branch       string `json:"branch"`

	NewCommentsDisabled bool `json:"new_comments_disabled"`

	EnvironmentConfigID uint `json:"environment_config_id"`
}
