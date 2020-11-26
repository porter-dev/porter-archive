package models

import (
	"gorm.io/gorm"
)

// Registry is an integration that can connect to a Docker image registry via
// a specific auth mechanism
type Registry struct {
	gorm.Model

	// Name of the registry
	Name string `json:"name"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	GCPIntegrationID uint
	AWSIntegrationID uint
}

// RegistryExternal is an external Registry to be shared over REST
type RegistryExternal struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// Name of the registry
	Name string `json:"name"`
}

// Externalize generates an external Registry to be shared over REST
func (r *Registry) Externalize() *RegistryExternal {
	return &RegistryExternal{
		ID:        r.ID,
		ProjectID: r.ProjectID,
		Name:      r.Name,
	}
}
