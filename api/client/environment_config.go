package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

func (c *Client) GetEnvironmentConfig(
	ctx context.Context,
	projID, clusterID, envConfID uint,
) (*types.EnvironmentConfig, error) {
	resp := &types.EnvironmentConfig{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/env_config/%d",
			projID,
			clusterID,
			envConfID,
		),
		nil,
		resp,
	)

	return resp, err
}

func (c *Client) GetPorterAppByEnvironment(
	ctx context.Context,
	projID, clusterID, envConfID uint,
	stackName string,
) (*types.PorterApp, error) {
	resp := &types.PorterApp{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/env_config/%d/stacks/%s",
			projID,
			clusterID,
			envConfID,
			stackName,
		),
		nil,
		resp,
	)

	return resp, err
}
