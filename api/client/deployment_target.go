package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/server/handlers/deployment_target"
)

// CreateDeploymentTarget creates a new deployment target for a given project and cluster with the provided name
func (c *Client) CreateDeploymentTarget(
	ctx context.Context,
	projectID, clusterID uint,
	selector string,
	preview bool,
) (*deployment_target.CreateDeploymentTargetResponse, error) {
	resp := &deployment_target.CreateDeploymentTargetResponse{}

	req := &deployment_target.CreateDeploymentTargetRequest{
		Selector: selector,
		Preview:  preview,
	}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/deployment-targets",
			projectID, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}
