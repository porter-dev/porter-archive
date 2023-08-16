package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/server/handlers/porter_app"

	"github.com/porter-dev/porter/api/types"
)

func (c *Client) NewGetPorterApp(
	ctx context.Context,
	projectID, clusterID uint,
	appName string,
) (*types.PorterApp, error) {
	resp := &types.PorterApp{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/applications/%s",
			projectID, clusterID, appName,
		),
		nil,
		resp,
	)

	return resp, err
}

func (c *Client) NewCreatePorterApp(
	ctx context.Context,
	projectID, clusterID uint,
	appName string,
	req *types.CreatePorterAppRequest,
) (*types.PorterApp, error) {
	resp := &types.PorterApp{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/applications/%s",
			projectID, clusterID, appName,
		),
		req,
		resp,
	)

	return resp, err
}

// NewCreateOrUpdatePorterAppEvent will create a porter app event if one does not exist, or else it will update the existing one if an ID is passed in the object
func (c *Client) NewCreateOrUpdatePorterAppEvent(
	ctx context.Context,
	projectID, clusterID uint,
	appName string,
	req *types.CreateOrUpdatePorterAppEventRequest,
) (types.PorterAppEvent, error) {
	resp := &types.PorterAppEvent{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/applications/%s/events",
			projectID, clusterID, appName,
		),
		req,
		resp,
	)

	return *resp, err
}

// TODO: remove these functions once they are no longer called (check telemetry)
func (c *Client) GetPorterApp(
	ctx context.Context,
	projectID, clusterID uint,
	stackName string,
) (*types.PorterApp, error) {
	resp := &types.PorterApp{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/stacks/%s",
			projectID, clusterID, stackName,
		),
		nil,
		resp,
	)

	return resp, err
}

func (c *Client) CreatePorterApp(
	ctx context.Context,
	projectID, clusterID uint,
	name string,
	req *types.CreatePorterAppRequest,
) (*types.PorterApp, error) {
	resp := &types.PorterApp{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/stacks/%s",
			projectID, clusterID, name,
		),
		req,
		resp,
	)

	return resp, err
}

// CreateOrUpdatePorterAppEvent will create a porter app event if one does not exist, or else it will update the existing one if an ID is passed in the object
func (c *Client) CreateOrUpdatePorterAppEvent(
	ctx context.Context,
	projectID, clusterID uint,
	name string,
	req *types.CreateOrUpdatePorterAppEventRequest,
) (types.PorterAppEvent, error) {
	resp := &types.PorterAppEvent{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/stacks/%s/events",
			projectID, clusterID, name,
		),
		req,
		resp,
	)

	return *resp, err
}

// ListEnvGroups (List all Env Groups for a given cluster)
func (c *Client) ListEnvGroups(
	ctx context.Context,
	projectID, clusterID uint,
) (types.ListEnvironmentGroupsResponse, error) {
	resp := &types.ListEnvironmentGroupsResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/environment-groups",
			projectID, clusterID,
		),
		nil,
		resp,
	)

	return *resp, err
}

// ParseYAML takes in a base64 encoded porter yaml and returns an app proto
func (c *Client) ParseYAML(
	ctx context.Context,
	projectID, clusterID uint,
	b64Yaml string,
) (*porter_app.ParsePorterYAMLToProtoResponse, error) {
	resp := &porter_app.ParsePorterYAMLToProtoResponse{}

	req := &porter_app.ParsePorterYAMLToProtoRequest{
		Base64Yaml: b64Yaml,
	}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/parse",
			projectID, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}
