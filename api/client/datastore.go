package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

// CreateDatastoreProxy creates a proxy to connect to a datastore
func (c *Client) CreateDatastoreProxy(
	ctx context.Context,
	projectID uint,
	datastoreName string,
	req *types.CreateDatastoreProxyRequest,
) (*types.CreateDatastoreProxyResponse, error) {
	resp := &types.CreateDatastoreProxyResponse{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/datastores/%s/create-proxy",
			projectID, datastoreName,
		),
		req,
		resp,
	)

	return resp, err
}
