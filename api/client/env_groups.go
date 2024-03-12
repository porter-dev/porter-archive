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

// UpdateEnvGroupInput is the input for the UpdateEnvGroup method
type UpdateEnvGroupInput struct {
	ProjectID    uint
	ClusterID    uint
	EnvGroupName string
	Variables    map[string]string
	Secrets      map[string]string
}

// UpdateEnvGroup creates or updates an environment group with the provided variables
func (c *Client) UpdateEnvGroup(
	ctx context.Context,
	inp UpdateEnvGroupInput,
) error {
	req := &environment_groups.UpdateEnvironmentGroupRequest{
		Name:            inp.EnvGroupName,
		Variables:       inp.Variables,
		SecretVariables: inp.Secrets,
	}

	return c.postRequest(
		fmt.Sprintf("/projects/%d/clusters/%d/environment-groups", inp.ProjectID, inp.ClusterID),
		req,
		nil,
	)
}
