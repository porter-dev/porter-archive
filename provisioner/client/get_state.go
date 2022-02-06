package client

import (
	"context"
	"fmt"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

// CreateResource posts Terraform output to the provisioner service and creates the backing
// resource in the database
func (c *Client) GetState(
	ctx context.Context,
	projID, infraID uint,
) (*ptypes.TFState, error) {
	resp := &ptypes.TFState{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/infras/%d/state",
			projID, infraID,
		),
		nil,
		resp,
	)

	return resp, err
}
