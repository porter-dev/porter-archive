package integrations

import (
	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/types"
)

// BasicIntegration represents a basic auth mechanism via username/password
type BasicIntegration struct {
	gorm.Model

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// ------------------------------------------------------------------
	// All fields encrypted before storage.
	// ------------------------------------------------------------------

	// Username/Password for basic authentication to a cluster
	Username []byte `json:"username,omitempty"`
	Password []byte `json:"password,omitempty"`
}

func (b *BasicIntegration) ToBasicIntegrationType() *types.BasicIntegration {
	return &types.BasicIntegration{
		ID:        b.ID,
		UserID:    b.UserID,
		ProjectID: b.ProjectID,
	}
}

// ToProjectIntegration converts an oauth integration to a project integration
func (b *BasicIntegration) ToProjectIntegration(
	category string,
	service IntegrationService,
) *ProjectIntegration {
	return &ProjectIntegration{
		ID:            b.ID,
		ProjectID:     b.ProjectID,
		AuthMechanism: "basic",
		Category:      category,
		Service:       service,
	}
}
