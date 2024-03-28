package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

// CreateDeploymentTarget creates a deployment target with the given request options
func (c *Client) CreateDeploymentTarget(
	ctx context.Context,
	projectId uint,
	req *types.CreateDeploymentTargetRequest,
) (*types.CreateDeploymentTargetResponse, error) {
	resp := &types.CreateDeploymentTargetResponse{}

	err := c.postRequest(
		fmt.Sprintf("/projects/%d/targets", projectId),
		req,
		resp,
	)

	return resp, err
}

// DeploymentTarget retrieves a deployment target by id
func (c *Client) DeploymentTarget(
	ctx context.Context,
	projectId uint,
	targetIdentifer string,
) (*types.ReadDeploymentTargetResponse, error) {
	resp := &types.ReadDeploymentTargetResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/targets/%s", projectId, targetIdentifer),
		nil,
		resp,
	)

	return resp, err
}

// ListDeploymentTargets retrieves all deployment targets in a project
func (c *Client) ListDeploymentTargets(
	ctx context.Context,
	projectId uint,
	includePreviews bool,
) (*types.ListDeploymentTargetsResponse, error) {
	resp := &types.ListDeploymentTargetsResponse{}

	req := &types.ListDeploymentTargetsRequest{
		Preview: includePreviews,
	}

	err := c.getRequest(
		fmt.Sprintf("/projects/%d/targets", projectId),
		req,
		resp,
	)

	return resp, err
}
