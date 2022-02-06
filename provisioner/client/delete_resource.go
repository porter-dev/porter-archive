package client

import (
	"context"
	"fmt"
)

// DeleteResource notifies the provisioner service that the backing infrastructure has been
// destroyed
func (c *Client) DeleteResource(
	ctx context.Context,
	workspaceID string,
) error {
	err := c.deleteRequest(
		fmt.Sprintf(
			"/%s/resource",
			workspaceID,
		),
		nil,
		nil,
	)

	return err
}
