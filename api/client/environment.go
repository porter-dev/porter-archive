package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

func (c *Client) CreateDeployment(
	ctx context.Context,
	projID, gitInstallationID, clusterID uint,
	req *types.CreateDeploymentRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos/%d/clusters/%d/deployment",
			projID, gitInstallationID, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) GetDeployment(
	ctx context.Context,
	projID, gitInstallationID, clusterID uint,
	req *types.GetDeploymentRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos/%d/clusters/%d/deployment",
			projID, gitInstallationID, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) FinalizeDeployment(
	ctx context.Context,
	projID, gitInstallationID, clusterID uint,
	req *types.FinalizeDeploymentRequest,
) (*types.Deployment, error) {
	resp := &types.Deployment{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos/%d/clusters/%d/deployment/finalize",
			projID, gitInstallationID, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}
