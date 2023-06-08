package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

func (c *Client) GetPorterApp(
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

func (c *Client) CreatePorterApp(
	ctx context.Context,
	projectID, clusterID uint,
	name string,
	req *types.CreatePorterAppRequest,
) (*types.PorterApp, error) {
	resp := &types.PorterApp{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/stacks/%s",
			projectID, clusterID, name,
		),
		req,
		resp,
	)

	return resp, err
}

// CreateOrUpdatePorterAppEvent will create a porter app event if one does not exist, or else it will update the existing one if an ID is passed in the object
func (c *Client) CreateOrUpdatePorterAppEvent(
	ctx context.Context,
	projectID, clusterID uint,
	name string,
	req *types.CreateOrUpdatePorterAppEventRequest,
) (types.PorterAppEvent, error) {
	resp := &types.PorterAppEvent{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/stacks/%s/events",
			projectID, clusterID, name,
		),
		req,
		resp,
	)

	return *resp, err
}
