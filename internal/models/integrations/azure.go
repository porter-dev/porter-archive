package integrations

import (
	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/types"
)

// AzureIntegration is an auth mechanism that uses a Azure service account principal to
// authenticate
type AzureIntegration struct {
	gorm.Model

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The Azure client ID that this is linked to
	AzureClientID string `json:"azure_client_id"`

	// The Azure subscription ID that this is linked to
	AzureSubscriptionID string `json:"azure_subscription_id"`

	// The Azure tenant ID that this is linked to
	AzureTenantID string `json:"azure_tenant_id"`

	// ACR-specific fields
	ACRTokenName         string `json:"acr_token_name"`
	ACRResourceGroupName string `json:"acr_resource_group_name"`
	ACRName              string `json:"acr_name"`

	// ------------------------------------------------------------------
	// All fields encrypted before storage.
	// ------------------------------------------------------------------

	// The Azure service principal key
	ServicePrincipalSecret []byte `json:"service_principal_secret"`

	// The ACR passwords, if set
	ACRPassword1 []byte `json:"acr_password_1"`
	ACRPassword2 []byte `json:"acr_password_2"`

	// The AKS password, if set (used for bearer token auth)
	AKSPassword []byte `json:"aks_password"`
}

func (a *AzureIntegration) ToAzureIntegrationType() *types.AzureIntegration {
	return &types.AzureIntegration{
		CreatedAt:           a.CreatedAt,
		ID:                  a.ID,
		UserID:              a.UserID,
		ProjectID:           a.ProjectID,
		AzureClientID:       a.AzureClientID,
		AzureSubscriptionID: a.AzureSubscriptionID,
		AzureTenantID:       a.AzureTenantID,
	}
}
