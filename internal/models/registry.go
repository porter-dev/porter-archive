package models

import (
	"strings"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models/integrations"
	"gorm.io/gorm"
)

// Registry is an integration that can connect to a Docker image registry via
// a specific auth mechanism
type Registry struct {
	gorm.Model

	// Name of the registry
	Name string `json:"name"`

	// URL of the registry
	URL string `json:"url"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The infra id, if registry was provisioned with Porter
	InfraID uint `json:"infra_id"`

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	GCPIntegrationID   uint
	AWSIntegrationID   uint
	AzureIntegrationID uint
	DOIntegrationID    uint
	BasicIntegrationID uint

	// A token cache that can be used by an auth mechanism (integration), if desired
	TokenCache integrations.RegTokenCache
}

func (r *Registry) ToRegistryType() *types.Registry {
	var serv types.RegistryService

	if r.AWSIntegrationID != 0 {
		serv = types.ECR
	} else if r.GCPIntegrationID != 0 {
		serv = types.GCR
	} else if r.DOIntegrationID != 0 {
		serv = types.DOCR
	} else if r.AzureIntegrationID != 0 {
		serv = types.ACR
	} else if strings.Contains(r.URL, "index.docker.io") {
		serv = types.DockerHub
	}

	uri := r.URL

	// remove the protocol
	if splStr := strings.Split(uri, "://"); len(splStr) > 1 {
		uri = splStr[1]
	}

	return &types.Registry{
		ID:                 r.ID,
		ProjectID:          r.ProjectID,
		Name:               r.Name,
		URL:                uri,
		Service:            string(serv),
		InfraID:            r.InfraID,
		GCPIntegrationID:   r.GCPIntegrationID,
		AWSIntegrationID:   r.AWSIntegrationID,
		AzureIntegrationID: r.AzureIntegrationID,
		DOIntegrationID:    r.DOIntegrationID,
		BasicIntegrationID: r.BasicIntegrationID,
	}
}
