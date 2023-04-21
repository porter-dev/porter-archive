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
	namespace string,
	req *types.CreateStackReleaseRequest,
) error {
	return c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces/%s/stacks",
			projectID, clusterID, namespace,
		),
		req,
		nil,
	)
}

// UpdateStack updates the stack
func (c *Client) UpdateStack(
	ctx context.Context,
	projectID, clusterID uint,
	namespace string,
	req *types.CreateStackReleaseRequest,
) error {
	return c.patchRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces/%s/stacks",
			projectID, clusterID, namespace,
		),
		req,
		nil,
	)
}
