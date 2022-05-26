package integrations

import "gorm.io/gorm"

// GitlabIntegration takes care of Gitlab related auth mechanisms and data
type GitlabIntegration struct {
	gorm.Model

	// Project ID of the project that this gitlab integration is linked with
	ProjectID uint `json:"project_id"`

	// URL of the Gitlab instance to talk to
	InstanceURL string `json:"instance_url"`

	// Gitlab instance-wide app's client ID
	AppClientID []byte `json:"app_client_id"`

	// Gitlab instance-wide app's client secret
	AppClientSecret []byte `json:"app_client_secret"`
}
