package client

import (
	"context"
	"fmt"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

// GetRawState gets the state stored for that infrastructure
func (c *Client) GetRawState(
	ctx context.Context,
	workspaceID string,
) (*ptypes.ParseableRawTFState, error) {
	resp := &ptypes.ParseableRawTFState{}

	err := c.getRequest(
		fmt.Sprintf(
			"/%s/tfstate/raw",
			workspaceID,
		),
		nil,
		resp,
	)

	return resp, err
}
