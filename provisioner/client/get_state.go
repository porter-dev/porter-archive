package client

import (
	"context"
	"fmt"
	"strings"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

var ErrDoesNotExist = fmt.Errorf("state file does not exist")

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

	if err != nil && strings.Contains(err.Error(), "current state file does not exist yet") {
		return nil, ErrDoesNotExist
	}

	return resp, err
}
