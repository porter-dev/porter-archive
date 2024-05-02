package integrations

import "gorm.io/gorm"

// NeonIntegration is an integration for the Neon service
type NeonIntegration struct {
	gorm.Model

	ProjectID uint `json:"project_id"`

	SharedOAuthModel
}
