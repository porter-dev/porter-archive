package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

// GetReleaseWebhook retrieves the release webhook for a given release
func (c *Client) GetReleaseWebhook(
	ctx context.Context,
	projID, clusterID uint,
	name, namespace string,
) (*types.PorterRelease, error) {
	resp := &types.PorterRelease{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces/%s/releases/%s/webhook",
			projID,
			clusterID,
			namespace,
			name,
		),
		nil,
		resp,
	)

	return resp, err
}

// DeployWithWebhook deploys an application with an image tag using a unique webhook URI
func (c *Client) DeployWithWebhook(
	ctx context.Context,
	webhook string,
	req *types.WebhookRequest,
) error {
	return c.postRequest(
		fmt.Sprintf(
			"/webhooks/deploy/%s",
			webhook,
		),
		req,
		nil,
	)
}

// UpdateBatchImage updates all releases that use a certain image with a new tag,
// within a single namespace
func (c *Client) UpdateBatchImage(
	ctx context.Context,
	projID, clusterID uint,
	namespace string,
	req *types.UpdateImageBatchRequest,
) error {
	return c.postRequest(
		fmt.Sprintf("/projects/%d/clusters/%d/namespaces/%s/releases/image/batch", projID, clusterID, namespace),
		req,
		nil,
	)
}

func (c *Client) DeployTemplate(
	ctx context.Context,
	projID, clusterID uint,
	namespace string,
	req *types.CreateReleaseRequest,
) error {
	return c.postRequest(
		fmt.Sprintf("/projects/%d/clusters/%d/namespaces/%s/releases", projID, clusterID, namespace),
		req,
		nil,
	)
}

// UpgradeRelease upgrades a specific release with new values or chart version
func (c *Client) UpgradeRelease(
	ctx context.Context,
	projID, clusterID uint,
	namespace, name string,
	req *types.UpgradeReleaseRequest,
) error {
	return c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces/%s/releases/%s/0/upgrade",
			projID, clusterID,
			namespace, name,
		),
		req,
		nil,
	)
}
