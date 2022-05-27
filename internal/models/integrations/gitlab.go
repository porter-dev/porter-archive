package integrations

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// GitlabIntegration takes care of Gitlab app related data
type GitlabIntegration struct {
	gorm.Model

	// Project ID of the project that this gitlab integration is linked with
	ProjectID uint `json:"project_id"`

	// URL of the Gitlab instance to talk to
	InstanceURL string `json:"instance_url"`

	// ------------------------------------------------------------------
	// All fields encrypted before storage.
	// ------------------------------------------------------------------

	// Gitlab instance-wide app's client ID
	AppClientID []byte `json:"app_client_id"`

	// Gitlab instance-wide app's client secret
	AppClientSecret []byte `json:"app_client_secret"`
}

func (gi *GitlabIntegration) ToGitlabIntegrationType() *types.GitlabIntegration {
	return &types.GitlabIntegration{
		CreatedAt:   gi.CreatedAt,
		ID:          gi.ID,
		ProjectID:   gi.ProjectID,
		InstanceURL: gi.InstanceURL,
	}
}
