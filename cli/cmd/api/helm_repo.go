package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/internal/models"
)

// CreateHelmRepoRequest represents the accepted fields for creating
// a Helm repository with basic authentication
type CreateHelmRepoRequest struct {
	Name               string `json:"name"`
	RepoURL            string `json:"repo_url"`
	BasicIntegrationID uint   `json:"basic_integration_id"`
}

// CreateHelmRepoResponse is the resulting helm repo after creation
type CreateHelmRepoResponse models.HelmRepoExternal

// CreateHelmRepo creates an Helm repository integration with basic authentication
func (c *Client) CreateHelmRepo(
	ctx context.Context,
	projectID uint,
	createHR *CreateHelmRepoRequest,
) (*CreateHelmRepoResponse, error) {
	data, err := json.Marshal(createHR)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects/%d/helmrepos", c.BaseURL, projectID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &CreateHelmRepoResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// ListHelmRepoResponse is the list of Helm repos for a project
type ListHelmRepoResponse []models.HelmRepoExternal

// ListHelmRepos returns a list of Helm repos for a project
func (c *Client) ListHelmRepos(
	ctx context.Context,
	projectID uint,
) (ListHelmRepoResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/helmrepos", c.BaseURL, projectID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &ListHelmRepoResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return *bodyResp, nil
}

// ListChartsResponse is the list of charts in a Helm repository
type ListChartsResponse []models.PorterChartList

// ListCharts lists the charts in a Helm repository
func (c *Client) ListCharts(
	ctx context.Context,
	projectID uint,
	helmID uint,
) (ListChartsResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/helmrepos/%d/charts", c.BaseURL, projectID, helmID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &ListChartsResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return *bodyResp, nil
}
