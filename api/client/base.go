package client

import (
	"context"

	sharedConfig "github.com/porter-dev/porter/api/server/shared/config"
)

func (c *Client) GetPorterInstanceMetadata(ctx context.Context) (*sharedConfig.Metadata, error) {
	resp := &sharedConfig.Metadata{}

	err := c.getRequest(
		"/metadata",
		nil,
		resp,
	)

	if err != nil {
		return nil, err
	}

	return resp, nil
}
