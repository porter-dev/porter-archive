// +build ee

package vault

import "github.com/porter-dev/porter/internal/repository/credentials"

type CreateVaultSecretRequest struct {
	Data interface{} `json:"data"`
}

type GetVaultSecretGenericResponse struct {
	RequestID string `json:"request_id"`
}

type VaultMetadata struct {
	CreatedTime string `json:"created_time"`
	Destroyed   bool   `json:"destroyed"`
	Version     uint   `json:"version"`
}

type GetOAuthCredentialResponse struct {
	*GetVaultSecretGenericResponse
	Data *GetOAuthCredentialData `json:"data"`
}

type GetOAuthCredentialData struct {
	Metadata *VaultMetadata               `json:"metadata"`
	Data     *credentials.OAuthCredential `json:"data"`
}

type GetGCPCredentialResponse struct {
	*GetVaultSecretGenericResponse
	Data *GetGCPCredentialData `json:"data"`
}

type GetGCPCredentialData struct {
	Metadata *VaultMetadata             `json:"metadata"`
	Data     *credentials.GCPCredential `json:"data"`
}

type GetAWSCredentialResponse struct {
	*GetVaultSecretGenericResponse
	Data *GetAWSCredentialData `json:"data"`
}

type GetAWSCredentialData struct {
	Metadata *VaultMetadata             `json:"metadata"`
	Data     *credentials.AWSCredential `json:"data"`
}
