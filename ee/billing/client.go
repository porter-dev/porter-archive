//go:build ee
// +build ee

package billing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gorilla/schema"
	"github.com/porter-dev/porter/api/types"
	cemodels "github.com/porter-dev/porter/internal/models"
)

// Client contains an API client for the internal billing engine
type Client struct {
	apiKey          string
	serverURL       string
	publicServerURL string
	httpClient      *http.Client
}

// NewClient creates a new billing API client
func NewClient(serverURL, publicServerURL, apiKey string) (*Client, error) {
	httpClient := &http.Client{
		Timeout: time.Minute,
	}

	client := &Client{apiKey, serverURL, publicServerURL, httpClient}

	return client, nil
}

func (c *Client) CreateTeam(user *cemodels.User, proj *cemodels.Project) (string, error) {
	// call the internal billing endpoint to create a new customer in the database
	reqData := &CreateCustomerRequest{
		Email:       user.Email,
		UserID:      user.ID,
		ProjectID:   proj.ID,
		ProjectName: proj.Name,
	}

	err := c.postRequest("/api/v1/private/customer", reqData, nil)

	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%d-%d", proj.ID, user.ID), nil
}

func (c *Client) DeleteTeam(user *cemodels.User, proj *cemodels.Project) error {
	// call delete customer
	reqData := &DeleteCustomerRequest{
		UserID:    user.ID,
		ProjectID: proj.ID,
	}

	return c.deleteRequest("/api/v1/private/customer", reqData, nil)
}

func (c *Client) GetRedirectURI(user *cemodels.User, proj *cemodels.Project) (string, error) {
	// get an internal cookie
	reqData := &CreateBillingCookieRequest{
		ProjectName: proj.Name,
		ProjectID:   proj.ID,
		UserID:      user.ID,
		Email:       user.Email,
	}

	createCookieVals := make(map[string][]string)
	err := schema.NewEncoder().Encode(reqData, createCookieVals)

	if err != nil {
		return "", err
	}

	urlVals := url.Values(createCookieVals)
	encodedURLVals := urlVals.Encode()

	dst := &CreateBillingCookieResponse{}

	err = c.postRequest("/api/v1/private/cookie", reqData, dst)

	if err != nil {
		return "", err
	}

	redirectData := &VerifyUserRequest{
		TokenID: dst.TokenID,
		Token:   dst.Token,
	}

	vals := make(map[string][]string)
	err = schema.NewEncoder().Encode(redirectData, vals)

	if err != nil {
		return "", err
	}

	urlVals = url.Values(vals)
	encodedURLVals = urlVals.Encode()

	return fmt.Sprintf("%s/api/v1/verify?%s", c.publicServerURL, encodedURLVals), nil
}

// VerifySignature verifies a webhook signature based on hmac protocol
func (c *Client) VerifySignature(signature string, body []byte) bool {
	if len(signature) != 71 || !strings.HasPrefix(signature, "sha256=") {
		return false
	}

	actual := make([]byte, 32)
	_, err := hex.Decode(actual, []byte(signature[7:]))

	if err != nil {
		return false
	}

	computed := hmac.New(sha256.New, []byte(c.apiKey))
	_, err = computed.Write(body)

	if err != nil {
		return false
	}

	return hmac.Equal(computed.Sum(nil), actual)
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

func (c *Client) getRequest(path string, dst interface{}, query ...map[string]string) error {
	reqURL, err := url.Parse(c.serverURL)

	if err != nil {
		return nil
	}

	reqURL.Path = path

	q := reqURL.Query()
	for _, queryGroup := range query {
		for key, val := range queryGroup {
			q.Add(key, val)
		}
	}

	reqURL.RawQuery = q.Encode()

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
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

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
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

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

const (
	FeatureSlugCPU      string = "cpu"
	FeatureSlugMemory   string = "memory"
	FeatureSlugClusters string = "clusters"
	FeatureSlugUsers    string = "users"
)

func (c *Client) ParseProjectUsageFromWebhook(payload []byte) (*cemodels.ProjectUsage, *types.FeatureFlags, error) {
	usageData := &APIWebhookRequest{}

	err := json.Unmarshal(payload, usageData)

	if err != nil {
		return nil, nil, err
	}

	return &cemodels.ProjectUsage{
			ProjectID:      usageData.ProjectID,
			ResourceCPU:    usageData.CPU,
			ResourceMemory: usageData.Memory * 1000,
			Clusters:       usageData.Clusters,
			Users:          usageData.Users,
		}, &types.FeatureFlags{
			PreviewEnvironmentsEnabled: usageData.PreviewEnvironmentsEnabled,
			ManagedInfraEnabled:        usageData.ManagedInfraEnabled,
			StacksEnabled:              usageData.StacksEnabled,
			ManagedDatabasesEnabled:    usageData.ManagedDatabasesEnabled,
		}, nil
}
