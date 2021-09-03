package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/types"
)

// CreateAWSIntegration creates an AWS integration with the given request options
func (c *Client) CreateAWSIntegration(
	ctx context.Context,
	projectID uint,
	createAWS *types.CreateAWSRequest,
) (*types.CreateAWSResponse, error) {
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
	bodyResp := &types.CreateAWSResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// CreateGCPIntegration creates a GCP integration with the given request options
func (c *Client) CreateGCPIntegration(
	ctx context.Context,
	projectID uint,
	createGCP *types.CreateGCPRequest,
) (*types.CreateGCPResponse, error) {
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
	bodyResp := &types.CreateGCPResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// CreateBasicAuthIntegration creates a "basic auth" integration
func (c *Client) CreateBasicAuthIntegration(
	ctx context.Context,
	projectID uint,
	createBasic *types.CreateBasicRequest,
) (*types.CreateBasicResponse, error) {
	data, err := json.Marshal(createBasic)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects/%d/integrations/basic", c.BaseURL, projectID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &types.CreateBasicResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// ListOAuthIntegrations lists the oauth integrations in a project
func (c *Client) ListOAuthIntegrations(
	ctx context.Context,
	projectID uint,
) (types.ListOAuthResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/integrations/oauth", c.BaseURL, projectID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &types.ListOAuthResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return *bodyResp, nil
}
