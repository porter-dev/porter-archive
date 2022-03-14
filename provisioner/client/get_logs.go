package client

import (
	"context"
	"fmt"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

// GetLogs returns logs from the operation, after the operation has completed
func (c *Client) GetLogs(
	ctx context.Context,
	workspaceID string,
) (*ptypes.GetLogsResponse, error) {
	resp := &ptypes.GetLogsResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/%s/logs",
			workspaceID,
		),
		nil,
		resp,
	)

	return resp, err
}
