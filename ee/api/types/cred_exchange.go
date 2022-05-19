package types

import "github.com/porter-dev/porter/internal/repository/credentials"

type CredentialsExchangeRequest struct {
	CredExchangeID    uint
	CredExchangeToken string

	// (optional) Vault token, if required
	VaultToken string
}

type CredentialsExchangeResponse struct {
	DO    *credentials.OAuthCredential `json:"do,omitempty"`
	GCP   *credentials.GCPCredential   `json:"gcp,omitempty"`
	AWS   *credentials.AWSCredential   `json:"aws,omitempty"`
	Azure *credentials.AzureCredential `json:"azure,omitempty"`
}
