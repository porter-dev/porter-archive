package models

import (
	"github.com/porter-dev/porter/internal/models/integrations"
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

	// A token cache that can be used by an auth mechanism, if desired
	TokenCache integrations.TokenCache `json:"token_cache"`
}

// RegistryExternal is an external Registry to be shared over REST
type RegistryExternal struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// Name of the registry
	Name string `json:"name"`

	// The integration service for this registry
	Service integrations.IntegrationService `json:"service"`
}

// Externalize generates an external Registry to be shared over REST
func (r *Registry) Externalize() *RegistryExternal {
	var serv integrations.IntegrationService

	if r.AWSIntegrationID != 0 {
		serv = integrations.ECR
	} else if r.GCPIntegrationID != 0 {
		serv = integrations.GCR
	}

	return &RegistryExternal{
		ID:        r.ID,
		ProjectID: r.ProjectID,
		Name:      r.Name,
		Service:   serv,
	}
}
