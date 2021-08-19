package client

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/internal/models"
)

func (c *Client) ListTemplates(
	ctx context.Context,
) ([]*models.PorterChartList, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/templates", c.BaseURL),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)

	bodyResp := make([]*models.PorterChartList, 0)

	if httpErr, err := c.sendRequest(req, &bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

func (c *Client) GetTemplate(
	ctx context.Context,
	name, version string,
) (*models.PorterChartRead, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/templates/%s/%s", c.BaseURL, name, version),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)

	bodyResp := &models.PorterChartRead{}

	if httpErr, err := c.sendRequest(req, &bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}
