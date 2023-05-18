package types

type GitInstallation struct {
	ID uint `json:"id"`

	// Can belong to either a user or an organization
	AccountID int64 `json:"account_id"`

	// Installation ID (used for authentication)
	InstallationID int64 `json:"installation_id"`
}

type GetGitInstallationResponse GitInstallation

type ListGitInstallationIDsResponse []int64

// Repo represents a GitHub or Gitab repository
type Repo struct {
	FullName string
	Kind     string
}

type ListReposResponse []Repo

const (
	URLParamGitKind           URLParam = "kind"
	URLParamGitRepoOwner      URLParam = "owner"
	URLParamGitRepoName       URLParam = "name"
	URLParamGitBranch         URLParam = "branch"
	URLParamIncomingWebhookID URLParam = "webhook_id"
)

type ListRepoBranchesResponse []string

type ListGitlabRepoBranchesRequest struct {
	RepoPath   string `schema:"repo_path" form:"required"`
	SearchTerm string `schema:"search_term"`
}

type GitlabRepoBranchRequest struct {
	RepoPath string `schema:"repo_path" form:"required"`
	Branch   string `schema:"branch" form:"required"`
}

type GetGitlabContentsRequest struct {
	GitlabRepoBranchRequest
	GetContentsRequest
}
type GetGitlabBuildpackRequest struct {
	GitlabRepoBranchRequest
	GetBuildpackRequest
}
type GetGitlabProcfileRequest struct {
	GitlabRepoBranchRequest
	GetProcfileRequest
}

type GetGitlabPorterYamlContentsRequest struct {
	GitlabRepoBranchRequest
	GetPorterYamlRequest
}

type GithubDirectoryRequest struct {
	Dir string `schema:"dir" form:"required"`
}

type GetBuildpackRequest struct {
	GithubDirectoryRequest
}

type GetContentsRequest struct {
	GithubDirectoryRequest
}

type GithubDirectoryItem struct {
	Path string `json:"path"`
	Type string `json:"type"`
}

type GetContentsResponse []GithubDirectoryItem

type GetPorterYamlRequest struct {
	Path string `schema:"path" form:"required"`
}

type GetProcfileRequest struct {
	Path string `schema:"path" form:"required"`
}

type GetProcfileResponse map[string]string

type GetTarballURLResponse struct {
	URLString       string `json:"url"`
	LatestCommitSHA string `json:"latest_commit_sha"`
}

type GetGithubAppAccountsResponse struct {
	Username string   `json:"username,omitempty"`
	Accounts []string `json:"accounts,omitempty"`
}

type GitInstallationPermission struct {
	PreviewEnvironments bool `json:"preview_environments"`
}
