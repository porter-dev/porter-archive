package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

func (c *Client) CreatePreviewEnvironment(
	ctx context.Context,
	projectID, clusterID uint,
	req *types.CreatePreviewEnvironmentRequest,
) (*types.PreviewEnvironment, error) {
	resp := &types.PreviewEnvironment{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/preview_environments",
			projectID, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}
