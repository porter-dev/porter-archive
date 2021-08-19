package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/internal/models"
)

type CreateDNSRecordRequest struct {
	ReleaseName string `json:"release_name"`
}

// CreateDNSRecordResponse is the DNS record that was created
type CreateDNSRecordResponse models.DNSRecordExternal

// CreateDNSRecord creates a Github action with basic authentication
func (c *Client) CreateDNSRecord(
	ctx context.Context,
	projectID, clusterID uint,
	createDNS *CreateDNSRecordRequest,
) (*CreateDNSRecordResponse, error) {
	data, err := json.Marshal(createDNS)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf(
			"%s/projects/%d/k8s/subdomain?cluster_id=%d",
			c.BaseURL,
			projectID,
			clusterID,
		),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)

	res := &CreateDNSRecordResponse{}

	if httpErr, err := c.sendRequest(req, res, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return res, nil
}
