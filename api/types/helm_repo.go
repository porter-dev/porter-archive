package types

type HelmRepo struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// Name of the repo
	Name string `json:"name"`

	RepoURL string `json:"repo_name"`
}

type GetHelmRepoResponse HelmRepo

type CreateUpdateHelmRepoRequest struct {
	URL                string `json:"url" form:"required"`
	Name               string `json:"name" form:"required"`
	BasicIntegrationID uint   `json:"basic_integration_id"`
}
