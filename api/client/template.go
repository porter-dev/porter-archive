package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

func (c *Client) ListTemplates(
	ctx context.Context,
	req *types.ListTemplatesRequest,
) (*types.ListTemplatesResponse, error) {
	resp := &types.ListTemplatesResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/templates",
		),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) GetTemplate(
	ctx context.Context,
	name, version string,
	req *types.GetTemplateRequest,
) (*types.GetTemplateResponse, error) {
	resp := &types.GetTemplateResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/templates/%s/%s",
			name, version,
		),
		req,
		resp,
	)

	return resp, err
}
