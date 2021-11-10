package types

import "github.com/porter-dev/porter/internal/integrations/buildpacks"

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
	URLParamGitKind      URLParam = "kind"
	URLParamGitRepoOwner URLParam = "owner"
	URLParamGitRepoName  URLParam = "name"
	URLParamGitBranch    URLParam = "branch"
)

type ListRepoBranchesResponse []string

type GithubDirectoryRequest struct {
	Dir string `schema:"dir" form:"required"`
}

type GetBuildpackRequest struct {
	GithubDirectoryRequest
}

type GetBuildpackResponse struct {
	Name       string                      `json:"name"`
	Runtime    string                      `json:"runtime"`
	Buildpacks []*buildpacks.BuildpackInfo `json:"buildpacks"`
	Config     map[string]interface{}      `json:"config"`
}

type GetContentsRequest struct {
	GithubDirectoryRequest
}

type GithubDirectoryItem struct {
	Path string `json:"path"`
	Type string `json:"type"`
}

type GetContentsResponse []GithubDirectoryItem

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
