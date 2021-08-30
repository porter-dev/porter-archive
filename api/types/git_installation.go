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
	URLParamGitKind      URLParam = "kind"
	URLParamGitRepoOwner URLParam = "owner"
	URLParamGitRepoName  URLParam = "name"
)

type ListRepoBranchesResponse []string
