package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// CreateAWSIntegrationRequest represents the accepted fields for creating
// an aws integration
type CreateAWSIntegrationRequest struct {
	AWSRegion          string `json:"aws_region"`
	AWSAccessKeyID     string `json:"aws_access_key_id"`
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
}

// CreateAWSIntegrationResponse is the resulting integration after creation
type CreateAWSIntegrationResponse ints.AWSIntegrationExternal

// CreateAWSIntegration creates an AWS integration with the given request options
func (c *Client) CreateAWSIntegration(
	ctx context.Context,
	projectID uint,
	createAWS *CreateAWSIntegrationRequest,
) (*CreateAWSIntegrationResponse, error) {
	data, err := json.Marshal(createAWS)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects/%d/integrations/aws", c.BaseURL, projectID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &CreateAWSIntegrationResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// CreateGCPIntegrationRequest represents the accepted fields for creating
// a gcp integration
type CreateGCPIntegrationRequest struct {
	GCPKeyData string `json:"gcp_key_data"`
}

// CreateGCPIntegrationResponse is the resulting integration after creation
type CreateGCPIntegrationResponse ints.GCPIntegrationExternal

// CreateGCPIntegration creates a GCP integration with the given request options
func (c *Client) CreateGCPIntegration(
	ctx context.Context,
	projectID uint,
	createGCP *CreateGCPIntegrationRequest,
) (*CreateGCPIntegrationResponse, error) {
	data, err := json.Marshal(createGCP)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects/%d/integrations/gcp", c.BaseURL, projectID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &CreateGCPIntegrationResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}
