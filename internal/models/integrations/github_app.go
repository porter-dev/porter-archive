package integrations

import "gorm.io/gorm"

// GithubAppInstallation is an instance of the porter github app
// we need to store account/installation id pairs in order to authenticate as the installation
type GithubAppInstallation struct {
	gorm.Model

	// Can belong to either a user or an organization
	AccountID string `json:"account_id"`

	// Installation ID (used for authentication)
	InstallationID string `json:"installation_id"`
}

type GithubAppInstallationExternal struct {
	ID uint `json:"id"`

	// Can belong to either a user or an organization
	AccountID string `json:"account_id"`

	// Installation ID (used for authentication)
	InstallationID string `json:"installation_id"`
}

func (r *GithubAppInstallation) Externalize() *GithubAppInstallationExternal {
	return &GithubAppInstallationExternal{
		ID:             r.ID,
		AccountID:      r.AccountID,
		InstallationID: r.InstallationID,
	}
}
