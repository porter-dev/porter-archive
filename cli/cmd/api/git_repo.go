package api

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/internal/models"
)

// ListGitRepoResponse is the list of Git repo integrations for a project
type ListGitRepoResponse []models.GitRepoExternal

// ListGitRepos returns a list of Git repos for a project
func (c *Client) ListGitRepos(
	ctx context.Context,
	projectID uint,
) (ListGitRepoResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/gitrepos", c.BaseURL, projectID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &ListGitRepoResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return *bodyResp, nil
}
