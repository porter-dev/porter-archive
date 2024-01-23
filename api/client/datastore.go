package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

func (c *Client) GetDatastore(
	ctx context.Context,
	projectID uint,
	datastoreName string,
) (*types.GetDatastoreResponse, error) {
	resp := &types.GetDatastoreResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/datastores/%s",
			projectID, datastoreName,
		),
		nil,
		resp,
	)

	return resp, err
}
