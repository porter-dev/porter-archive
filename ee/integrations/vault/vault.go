// +build ee

package vault

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository/credentials"
)

// Client contains an API client for IronPlans
type Client struct {
	apiKey       string
	serverURL    string
	secretPrefix string
	httpClient   *http.Client
}

// NewClient creates a new billing API client
func NewClient(serverURL, apiKey, secretPrefix string) *Client {
	httpClient := &http.Client{
		Timeout: time.Minute,
	}

	return &Client{apiKey, serverURL, secretPrefix, httpClient}
}

func (c *Client) WriteOAuthCredential(
	oauthIntegration *integrations.OAuthIntegration,
	data *credentials.OAuthCredential,
) error {
	reqData := &CreateVaultSecretRequest{
		Data: data,
	}

	return c.postRequest(fmt.Sprintf("/v1/%s", c.getOAuthCredentialPath(oauthIntegration)), reqData, nil)
}

func (c *Client) GetOAuthCredential(oauthIntegration *integrations.OAuthIntegration) (*credentials.OAuthCredential, error) {
	resp := &GetOAuthCredentialResponse{}

	err := c.getRequest(fmt.Sprintf("/v1/%s", c.getOAuthCredentialPath(oauthIntegration)), resp)

	if err != nil {
		return nil, err
	}

	return resp.Data.Data, nil
}

func (c *Client) CreateOAuthToken(oauthIntegration *integrations.OAuthIntegration) (string, error) {
	credPath := c.getOAuthCredentialPath(oauthIntegration)
	policyName := fmt.Sprintf("access-%d-oauth-%d", oauthIntegration.ProjectID, oauthIntegration.ID)

	return c.getToken(credPath, policyName)
}

func (c *Client) getOAuthCredentialPath(oauthIntegration *integrations.OAuthIntegration) string {
	return fmt.Sprintf(
		"kv/data/secret/%s/%d/oauth/%d",
		c.secretPrefix,
		oauthIntegration.ProjectID,
		oauthIntegration.ID,
	)
}

func (c *Client) WriteGCPCredential(
	gcpIntegration *integrations.GCPIntegration,
	data *credentials.GCPCredential) error {
	reqData := &CreateVaultSecretRequest{
		Data: data,
	}

	return c.postRequest(fmt.Sprintf("/v1/%s", c.getGCPCredentialPath(gcpIntegration)), reqData, nil)
}

func (c *Client) GetGCPCredential(gcpIntegration *integrations.GCPIntegration) (*credentials.GCPCredential, error) {
	resp := &GetGCPCredentialResponse{}

	err := c.getRequest(fmt.Sprintf("/v1/%s", c.getGCPCredentialPath(gcpIntegration)), resp)

	if err != nil {
		return nil, err
	}

	return resp.Data.Data, nil
}

func (c *Client) CreateGCPToken(gcpIntegration *integrations.GCPIntegration) (string, error) {
	credPath := c.getGCPCredentialPath(gcpIntegration)
	policyName := fmt.Sprintf("access-%d-gcp-%d", gcpIntegration.ProjectID, gcpIntegration.ID)

	return c.getToken(credPath, policyName)
}

func (c *Client) getGCPCredentialPath(gcpIntegration *integrations.GCPIntegration) string {
	return fmt.Sprintf(
		"kv/data/secret/%s/%d/gcp/%d",
		c.secretPrefix,
		gcpIntegration.ProjectID,
		gcpIntegration.ID,
	)
}

func (c *Client) WriteAWSCredential(
	awsIntegration *integrations.AWSIntegration,
	data *credentials.AWSCredential) error {
	reqData := &CreateVaultSecretRequest{
		Data: data,
	}

	return c.postRequest(fmt.Sprintf("/v1/%s", c.getAWSCredentialPath(awsIntegration)), reqData, nil)
}

func (c *Client) GetAWSCredential(awsIntegration *integrations.AWSIntegration) (*credentials.AWSCredential, error) {
	resp := &GetAWSCredentialResponse{}

	err := c.getRequest(fmt.Sprintf("/v1/%s", c.getAWSCredentialPath(awsIntegration)), resp)

	if err != nil {
		return nil, err
	}

	return resp.Data.Data, nil
}

func (c *Client) CreateAWSToken(awsIntegration *integrations.AWSIntegration) (string, error) {
	credPath := c.getAWSCredentialPath(awsIntegration)
	policyName := fmt.Sprintf("access-%d-aws-%d", awsIntegration.ProjectID, awsIntegration.ID)

	return c.getToken(credPath, policyName)
}

func (c *Client) getAWSCredentialPath(awsIntegration *integrations.AWSIntegration) string {
	return fmt.Sprintf(
		"kv/data/secret/%s/%d/aws/%d",
		c.secretPrefix,
		awsIntegration.ProjectID,
		awsIntegration.ID,
	)
}

func (c *Client) WriteAzureCredential(
	azIntegration *integrations.AzureIntegration,
	data *credentials.AzureCredential) error {
	reqData := &CreateVaultSecretRequest{
		Data: data,
	}

	return c.postRequest(fmt.Sprintf("/v1/%s", c.getAzureCredentialPath(azIntegration)), reqData, nil)
}

func (c *Client) GetAzureCredential(azIntegration *integrations.AzureIntegration) (*credentials.AzureCredential, error) {
	resp := &GetAzureCredentialResponse{}

	err := c.getRequest(fmt.Sprintf("/v1/%s", c.getAzureCredentialPath(azIntegration)), resp)

	if err != nil {
		return nil, err
	}

	return resp.Data.Data, nil
}

func (c *Client) CreateAzureToken(azIntegration *integrations.AzureIntegration) (string, error) {
	credPath := c.getAzureCredentialPath(azIntegration)
	policyName := fmt.Sprintf("access-%d-azure-%d", azIntegration.ProjectID, azIntegration.ID)

	return c.getToken(credPath, policyName)
}

func (c *Client) getAzureCredentialPath(azIntegration *integrations.AzureIntegration) string {
	return fmt.Sprintf(
		"kv/data/secret/%s/%d/azure/%d",
		c.secretPrefix,
		azIntegration.ProjectID,
		azIntegration.ID,
	)
}

const readOnlyPolicyTemplate = `path "%s" {
  capabilities = ["read"]
}`

func (c *Client) getToken(credPath, policyName string) (string, error) {
	policy := fmt.Sprintf(readOnlyPolicyTemplate, credPath)

	policyReq := &CreatePolicyRequest{
		Policy: policy,
	}

	err := c.postRequest(fmt.Sprintf("/v1/sys/policy/%s", policyName), policyReq, nil)

	if err != nil {
		return "", err
	}

	tokenReq := &CreateTokenRequest{
		Policies: []string{policyName},
		Meta: Meta{
			User: policyName,
		},
		TTL: "6h",
	}

	tokenResp := &CreateTokenResponse{}

	err = c.postRequest("/v1/auth/token/create", tokenReq, tokenResp)

	if err != nil {
		return "", err
	}

	return tokenResp.Auth.Token, nil
}

func (c *Client) postRequest(path string, data interface{}, dst interface{}) error {
	return c.writeRequest("POST", path, data, dst)
}

func (c *Client) putRequest(path string, data interface{}, dst interface{}) error {
	return c.writeRequest("PUT", path, data, dst)
}

func (c *Client) deleteRequest(path string, data interface{}, dst interface{}) error {
	return c.writeRequest("DELETE", path, data, dst)
}

func (c *Client) getRequest(path string, dst interface{}) error {
	reqURL, err := url.Parse(c.serverURL)

	if err != nil {
		return nil
	}

	reqURL.Path = path

	req, err := http.NewRequest(
		"GET",
		reqURL.String(),
		nil,
	)

	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Accept", "application/json; charset=utf-8")
	req.Header.Set("X-Vault-Token", c.apiKey)

	res, err := c.httpClient.Do(req)

	if err != nil {
		return err
	}

	defer res.Body.Close()

	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusBadRequest {
		resBytes, err := ioutil.ReadAll(res.Body)

		if err != nil {
			return fmt.Errorf("request failed with status code %d, but could not read body (%s)\n", res.StatusCode, err.Error())
		}

		return fmt.Errorf("request failed with status code %d: %s\n", res.StatusCode, string(resBytes))
	}

	if dst != nil {
		return json.NewDecoder(res.Body).Decode(dst)
	}

	return nil
}

func (c *Client) writeRequest(method, path string, data interface{}, dst interface{}) error {
	reqURL, err := url.Parse(c.serverURL)

	if err != nil {
		return nil
	}

	reqURL.Path = path

	var strData []byte

	if data != nil {
		strData, err = json.Marshal(data)

		if err != nil {
			return err
		}
	}

	req, err := http.NewRequest(
		method,
		reqURL.String(),
		strings.NewReader(string(strData)),
	)

	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Accept", "application/json; charset=utf-8")
	req.Header.Set("X-Vault-Token", c.apiKey)

	res, err := c.httpClient.Do(req)

	if err != nil {
		return err
	}

	defer res.Body.Close()

	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusBadRequest {
		resBytes, err := ioutil.ReadAll(res.Body)

		if err != nil {
			return fmt.Errorf("request failed with status code %d, but could not read body (%s)\n", res.StatusCode, err.Error())
		}

		return fmt.Errorf("request failed with status code %d: %s\n", res.StatusCode, string(resBytes))
	}

	if dst != nil {
		return json.NewDecoder(res.Body).Decode(dst)
	}

	return nil
}
