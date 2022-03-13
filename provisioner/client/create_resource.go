package client

import (
	"context"
	"fmt"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

// CreateResource posts Terraform output to the provisioner service and creates the backing
// resource in the database
func (c *Client) CreateResource(
	ctx context.Context,
	workspaceID string,
	req *ptypes.CreateResourceRequest,
) error {
	err := c.postRequest(
		fmt.Sprintf(
			"/%s/resource",
			workspaceID,
		),
		req,
		nil,
	)

	return err
}
