package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

// CreateAWSIntegration creates an AWS integration with the given request options
func (c *Client) CreateAWSIntegration(
	ctx context.Context,
	projectID uint,
	req *types.CreateAWSRequest,
) (*types.CreateAWSResponse, error) {
	resp := &types.CreateAWSResponse{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/integrations/aws",
			projectID,
		),
		req,
		resp,
	)

	return resp, err
}

// CreateGCPIntegration creates a GCP integration with the given request options
func (c *Client) CreateGCPIntegration(
	ctx context.Context,
	projectID uint,
	req *types.CreateGCPRequest,
) (*types.CreateGCPResponse, error) {
	resp := &types.CreateGCPResponse{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/integrations/gcp",
			projectID,
		),
		req,
		resp,
	)

	return resp, err
}

// CreateBasicAuthIntegration creates a "basic auth" integration
func (c *Client) CreateBasicAuthIntegration(
	ctx context.Context,
	projectID uint,
	req *types.CreateBasicRequest,
) (*types.CreateBasicResponse, error) {
	resp := &types.CreateBasicResponse{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/integrations/basic",
			projectID,
		),
		req,
		resp,
	)

	return resp, err
}

// ListOAuthIntegrations lists the oauth integrations in a project
func (c *Client) ListOAuthIntegrations(
	ctx context.Context,
	projectID uint,
) (*types.ListOAuthResponse, error) {
	resp := &types.ListOAuthResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/integrations/oauth",
			projectID,
		),
		nil,
		resp,
	)

	return resp, err
}
