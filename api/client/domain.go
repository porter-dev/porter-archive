package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

// CreateDNSRecord creates a Github action with basic authentication
func (c *Client) CreateDNSRecord(
	ctx context.Context,
	projID, clusterID uint,
	namespace, name string,
) (*types.DNSRecord, error) {
	resp := &types.DNSRecord{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces/%s/releases/%s/subdomain",
			projID, clusterID,
			namespace, name,
		),
		nil,
		resp,
	)

	return resp, err
}
