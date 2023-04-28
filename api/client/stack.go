package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

// CreateStack creates the stack
func (c *Client) CreateStack(
	ctx context.Context,
	projectID, clusterID uint,
	req *types.CreateStackReleaseRequest,
) error {
	return c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/stacks",
			projectID, clusterID,
		),
		req,
		nil,
	)
}

// UpdateStack updates the stack
func (c *Client) UpdateStack(
	ctx context.Context,
	projectID, clusterID uint,
	stackName string,
	req *types.CreateStackReleaseRequest,
) error {
	return c.patchRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/stacks/%s",
			projectID, clusterID, stackName,
		),
		req,
		nil,
	)
}

func (c *Client) GetStack(
	ctx context.Context,
	projectID, clusterID uint,
	stackName string,
) (*types.PorterApp, error) {
	resp := &types.PorterApp{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/stacks/%s",
			projectID, clusterID, stackName,
		),
		nil,
		resp,
	)

	return resp, err
}
