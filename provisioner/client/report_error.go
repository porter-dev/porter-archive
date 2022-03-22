package client

import (
	"context"
	"fmt"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

// ReportError reports a provisioning error to the provisioner service
func (c *Client) ReportError(
	ctx context.Context,
	workspaceID string,
	req *ptypes.ReportErrorRequest,
) error {
	err := c.postRequest(
		fmt.Sprintf(
			"/%s/error",
			workspaceID,
		),
		req,
		nil,
	)

	return err
}
