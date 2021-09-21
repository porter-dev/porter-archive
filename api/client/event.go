package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

// CreateEvent sends an event from deployment to the api
func (c *Client) CreateEvent(
	ctx context.Context,
	projID, clusterID uint,
	namespace, name string,
	req *types.UpdateReleaseStepsRequest,
) error {
	return c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces/%s/releases/%s/steps",
			projID, clusterID,
			namespace, name,
		),
		req,
		nil,
	)
}
