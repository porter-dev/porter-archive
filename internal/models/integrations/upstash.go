package integrations

import "gorm.io/gorm"

// UpstashIntegration is an integration for the Upstash service
type UpstashIntegration struct {
	gorm.Model

	ProjectID uint `json:"project_id"`

	SharedOAuthModel

	DeveloperApiKey []byte `json:"developer_api_key"`
}
