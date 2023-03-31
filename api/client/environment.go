package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

func (c *Client) ListEnvironments(
	ctx context.Context,
	projID, clusterID uint,
) (*types.ListEnvironmentsResponse, error) {
	resp := &types.ListEnvironmentsResponse{}

	err := c.getRequest(
		fmt.Sprintf("/projects/%d/clusters/%d/environments", projID, clusterID),
		nil,
		resp,
	)

	return resp, err
}

func (c *Client) CreateDeployment(
	ctx context.Context,
	projID, clusterID uint,
	req *types.CreateDeploymentRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.postRequest(
		fmt.Sprintf("/projects/%d/clusters/%d/deployments", projID, clusterID),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) GetDeployment(
	ctx context.Context,
	projID, clusterID, envID uint,
	req *types.GetDeploymentRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.getRequest(
		fmt.Sprintf("/projects/%d/clusters/%d/environments/%d/deployment", projID, clusterID, envID),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) UpdateDeployment(
	ctx context.Context,
	projID, clusterID uint,
	req *types.UpdateDeploymentByClusterRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.patchRequest(
		fmt.Sprintf("/projects/%d/clusters/%d/deployments", projID, clusterID),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) UpdateDeploymentStatus(
	ctx context.Context,
	projID, clusterID uint,
	req *types.UpdateDeploymentStatusByClusterRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.patchRequest(
		fmt.Sprintf("/projects/%d/clusters/%d/deployments/status", projID, clusterID),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) FinalizeDeployment(
	ctx context.Context,
	projID, clusterID uint,
	req *types.FinalizeDeploymentByClusterRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.postRequest(
		fmt.Sprintf("/projects/%d/clusters/%d/deployments/finalize", projID, clusterID),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) FinalizeDeploymentWithErrors(
	ctx context.Context,
	projID, clusterID uint,
	req *types.FinalizeDeploymentWithErrorsByClusterRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.postRequest(
		fmt.Sprintf("/projects/%d/clusters/%d/deployments/finalize_errors", projID, clusterID),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) DeleteDeployment(
	ctx context.Context,
	projID, clusterID, deploymentID uint,
) error {
	return c.deleteRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/deployments/%d",
			projID, clusterID, deploymentID,
		),
		nil, nil,
	)
}
