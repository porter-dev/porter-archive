package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

// ListStacks retrieves the list of stacks
func (c *Client) ListStacks(
	ctx context.Context,
	projectID, clusterID uint,
	namespace string,
) (*types.StackListResponse, error) {
	resp := &types.StackListResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/v1/projects/%d/clusters/%d/namespaces/%s/stacks",
			projectID, clusterID, namespace,
		),
		nil,
		resp,
	)

	return resp, err
}

func (c *Client) AddEnvGroupToStack(
	ctx context.Context,
	projectID, clusterID uint,
	namespace, stackID string,
	req *types.CreateStackEnvGroupRequest,
) error {
	err := c.patchRequest(
		fmt.Sprintf(
			"/v1/projects/%d/clusters/%d/namespaces/%s/stacks/%s/add_env_group",
			projectID, clusterID, namespace, stackID,
		),
		req,
		nil,
	)

	return err
}

func (c *Client) RemoveEnvGroupFromStack(
	ctx context.Context,
	projectID, clusterID uint,
	namespace, stackID, envGroupName string,
) error {
	err := c.deleteRequest(
		fmt.Sprintf(
			"/v1/projects/%d/clusters/%d/namespaces/%s/stacks/%s/remove_env_group/%s",
			projectID, clusterID, namespace, stackID, envGroupName,
		),
		nil,
		nil,
	)

	return err
}
