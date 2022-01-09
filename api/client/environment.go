package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

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
	projID, gitInstallationID, clusterID uint,
	gitRepoOwner, gitRepoName string,
	req *types.GetDeploymentRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos/%d/%s/%s/clusters/%d/deployment",
			projID, gitInstallationID, gitRepoOwner, gitRepoName, clusterID,
		),
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

func (c *Client) DeleteDeployment(
	ctx context.Context,
	projID, gitInstallationID, clusterID uint,
	gitRepoOwner, gitRepoName string,
	req *types.DeleteDeploymentRequest,
) error {
	return c.deleteRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos/%d/%s/%s/clusters/%d/deployment",
			projID, gitInstallationID, gitRepoOwner, gitRepoName, clusterID,
		),
		req,
		nil,
	)
}
