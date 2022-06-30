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
	projID, gitInstallationID, clusterID uint,
	gitRepoOwner, gitRepoName string,
	req *types.CreateDeploymentRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos/%d/%s/%s/clusters/%d/deployment",
			projID, gitInstallationID, gitRepoOwner, gitRepoName, clusterID,
		),
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
	projID, gitInstallationID, clusterID uint,
	gitRepoOwner, gitRepoName string,
	req *types.UpdateDeploymentRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos/%d/%s/%s/clusters/%d/deployment/update",
			projID, gitInstallationID, gitRepoOwner, gitRepoName, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) UpdateDeploymentStatus(
	ctx context.Context,
	projID, gitInstallationID, clusterID uint,
	gitRepoOwner, gitRepoName string,
	req *types.UpdateDeploymentStatusRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos/%d/%s/%s/clusters/%d/deployment/update/status",
			projID, gitInstallationID, gitRepoOwner, gitRepoName, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) FinalizeDeployment(
	ctx context.Context,
	projID, gitInstallationID, clusterID uint,
	gitRepoOwner, gitRepoName string,
	req *types.FinalizeDeploymentRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos/%d/%s/%s/clusters/%d/deployment/finalize",
			projID, gitInstallationID, gitRepoOwner, gitRepoName, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) FinalizeDeploymentWithErrors(
	ctx context.Context,
	projID, gitInstallationID, clusterID uint,
	gitRepoOwner, gitRepoName string,
	req *types.FinalizeDeploymentWithErrorsRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos/%d/%s/%s/clusters/%d/deployment/finalize_errors",
			projID, gitInstallationID, gitRepoOwner, gitRepoName, clusterID,
		),
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
