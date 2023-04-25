package types

type CreateStackReleaseRequest struct {
	// The Helm values for this release
	Values map[string]interface{} `json:"values"`
	// Used to construct the Chart.yaml
	Dependencies []Dependency `json:"dependencies" form:"required"`
	StackName    string       `json:"stack_name" form:"required,dns1123"`
}

type Dependency struct {
	Name       string `json:"name" form:"required"`
	Alias      string `json:"alias" form:"required"`
	Version    string `json:"version" form:"required"`
	Repository string `json:"repository" form:"required"`
}

type CreateSecretAndOpenGitHubPullRequest struct {
	StackName               string `json:"stack_name" form:"required,dns1123"`
	GithubAppInstallationID int64  `json:"github_app_installation_id" form:"required"`
	GithubRepoOwner         string `json:"github_repo_owner" form:"required"`
	GithubRepoName          string `json:"github_repo_name" form:"required"`
	OpenPr                  bool   `json:"open_pr" form:"required"`
}
