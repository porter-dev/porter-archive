package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/server/handlers/porter_app_v2"
)

// ParseYAML takes in a base64 encoded porter yaml and returns an app proto
func (c *Client) ParseYAML(
	ctx context.Context,
	projectID, clusterID uint,
	b64Yaml string,
) (*porter_app_v2.ParsePorterYAMLToProtoResponse, error) {
	resp := &porter_app_v2.ParsePorterYAMLToProtoResponse{}

	req := &porter_app_v2.ParsePorterYAMLToProtoRequest{
		Base64Yaml: b64Yaml,
	}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/appv2/parse",
			projectID, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}
