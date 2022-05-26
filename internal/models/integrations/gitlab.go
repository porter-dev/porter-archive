package integrations

import "gorm.io/gorm"

// GitlabIntegration takes care of Gitlab related auth mechanisms and data
type GitlabIntegration struct {
	gorm.Model

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// Project ID of the project that this gitlab integration is linked with
	ProjectID uint `json:"project_id"`

	// URL of the Gitlab instance to talk to
	ServerURL string `json:"server_url"`

	// Personal access token from Gitlab for a sudo user
	SudoAccessToken string `json:"sudo_access_token,omitempty"`

	// Username of the sudo admin account holder
	SudoUsername string `json:"sudo_username,omitempty"`
}
