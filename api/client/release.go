package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"github.com/stefanmcshane/helm/pkg/release"
)

func (c *Client) ListReleases(
	ctx context.Context,
	projectID, clusterID uint,
	namespace string,
	req *types.ListReleasesRequest,
) ([]*release.Release, error) {
	resp := make([]*release.Release, 0)

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces/%s/releases",
			projectID, clusterID,
			namespace,
		),
		req,
		&resp,
	)

	return resp, err
}
