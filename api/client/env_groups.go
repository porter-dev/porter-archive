package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/server/handlers/environment_groups"
)

// GetLatestEnvGroupVariables gets the latest environment group variables for a given environment group
func (c *Client) GetLatestEnvGroupVariables(
	ctx context.Context,
	projID, clusterID uint,
	envGroupName string,
) (*environment_groups.LatestEnvGroupVariablesResponse, error) {
	resp := &environment_groups.LatestEnvGroupVariablesResponse{}

	err := c.getRequest(
		fmt.Sprintf("/projects/%d/clusters/%d/environment-groups/%s/latest", projID, clusterID, envGroupName),
		nil,
		resp,
	)

	return resp, err
}
