package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
	ptypes "github.com/porter-dev/porter/provisioner/types"
)

// GetReleaseWebhook retrieves the release webhook for a given release
func (c *Client) Apply(
	ctx context.Context,
	projID, infraID uint,
	req *ptypes.ProvisionBaseRequest,
) (*types.Operation, error) {
	resp := &types.Operation{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/infras/%d/apply",
			projID,
			infraID,
		),
		req,
		resp,
	)

	return resp, err
}
