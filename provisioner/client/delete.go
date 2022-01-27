package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
	ptypes "github.com/porter-dev/porter/provisioner/types"
)

// Apply initiates a new apply operation for infra
func (c *Client) Delete(
	ctx context.Context,
	projID, infraID uint,
	req *ptypes.DeleteBaseRequest,
) (*types.Operation, error) {
	resp := &types.Operation{}

	err := c.deleteRequest(
		fmt.Sprintf(
			"/projects/%d/infras/%d",
			projID,
			infraID,
		),
		req,
		resp,
	)

	return resp, err
}
