package client

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/internal/models"
)

// GetReleaseLatestRevision gets the latest revision of a Helm release
type GetReleaseWebhookResponse models.ReleaseExternal

func (c *Client) GetReleaseWebhook(
	ctx context.Context,
	projID, clusterID uint,
	name, namespace string,
) (*GetReleaseWebhookResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/releases/%s/webhook_token?"+url.Values{
			"cluster_id": []string{fmt.Sprintf("%d", clusterID)},
			"namespace":  []string{namespace},
			"storage":    []string{"secret"},
		}.Encode(), c.BaseURL, projID, name),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &GetReleaseWebhookResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// DeployWithWebhook deploys an application with an image tag using a unique webhook URI
func (c *Client) DeployWithWebhook(
	ctx context.Context,
	webhook, tag string,
) error {
	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/webhooks/deploy/%s?commit=%s", c.BaseURL, webhook, tag),
		nil,
	)

	if err != nil {
		return err
	}

	req = req.WithContext(ctx)

	if httpErr, err := c.sendRequest(req, nil, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return err
	}

	return nil
}
