//go:build ee
// +build ee

package vault

import "github.com/porter-dev/porter/internal/repository/credentials"

type CreateVaultSecretRequest struct {
	Data interface{} `json:"data"`
}

type VaultGetResponse struct {
	RequestID string `json:"request_id"`
}

type VaultMetadata struct {
	CreatedTime string `json:"created_time"`
	Destroyed   bool   `json:"destroyed"`
	Version     uint   `json:"version"`
}

type GetOAuthCredentialResponse struct {
	*VaultGetResponse
	Data *GetOAuthCredentialData `json:"data"`
}

type GetOAuthCredentialData struct {
	Metadata *VaultMetadata               `json:"metadata"`
	Data     *credentials.OAuthCredential `json:"data"`
}

type GetGCPCredentialResponse struct {
	*VaultGetResponse
	Data *GetGCPCredentialData `json:"data"`
}

type GetGCPCredentialData struct {
	Metadata *VaultMetadata             `json:"metadata"`
	Data     *credentials.GCPCredential `json:"data"`
}

type GetAWSCredentialResponse struct {
	*VaultGetResponse
	Data *GetAWSCredentialData `json:"data"`
}

type GetAWSCredentialData struct {
	Metadata *VaultMetadata             `json:"metadata"`
	Data     *credentials.AWSCredential `json:"data"`
}

type GetAzureCredentialResponse struct {
	*VaultGetResponse
	Data *GetAzureCredentialData `json:"data"`
}

type GetAzureCredentialData struct {
	Metadata *VaultMetadata               `json:"metadata"`
	Data     *credentials.AzureCredential `json:"data"`
}

type GetGitlabCredentialResponse struct {
	*VaultGetResponse
	Data *GetGitlabCredentialData `json:"data"`
}

type GetGitlabCredentialData struct {
	Metadata *VaultMetadata                `json:"metadata"`
	Data     *credentials.GitlabCredential `json:"data"`
}

type CreatePolicyRequest struct {
	Policy string `json:"policy"`
}

type CreateTokenRequest struct {
	Policies []string `json:"policies"`
	Meta     Meta     `json:"meta"`
	TTL      string   `json:"ttl"`
}

type Meta struct {
	User string `json:"user"`
}

type CreateTokenResponse struct {
	*VaultGetResponse
	Auth *TokenAuth `json:"auth"`
}

type TokenAuth struct {
	Token string `json:"client_token"`
}
