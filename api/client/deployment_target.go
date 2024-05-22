package client

import (
	"context"
	"fmt"

	"github.com/google/uuid"
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

// DeleteDeploymentTarget deletes a deployment target in a project
func (c *Client) DeleteDeploymentTarget(
	ctx context.Context,
	projectId uint,
	deploymentTargetID uuid.UUID,
) error {
	return c.deleteRequest(
		fmt.Sprintf("/projects/%d/targets/%s", projectId, deploymentTargetID.String()),
		nil,
		nil,
	)
}
