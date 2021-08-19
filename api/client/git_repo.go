package client

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/server/api"
)

// ListGitRepoResponse is the list of Git repo integrations for a project
type ListGitRepoResponse []uint

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

type GetRepoTarballDownloadURLResp api.HandleGetRepoZIPDownloadURLResp

// ListGitRepos returns a list of Git repos for a project
func (c *Client) GetRepoZIPDownloadURL(
	ctx context.Context,
	projectID uint,
	gitActionConfig *models.GitActionConfigExternal,
) (*GetRepoTarballDownloadURLResp, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf(
			"%s/projects/%d/gitrepos/%d/repos/%s/%s/%s/tarball_url",
			c.BaseURL,
			projectID,
			gitActionConfig.GitRepoID,
			"github",
			gitActionConfig.GitRepo,
			gitActionConfig.GitBranch,
		),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &GetRepoTarballDownloadURLResp{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// ListGitRepoResponse is the list of Git repo integrations for a project
type ListGithubReposResponse []*api.Repo

// ListGitRepos returns a list of Git repos for a project
func (c *Client) ListGithubRepos(
	ctx context.Context,
	projectID, gitRepoID uint,
) (ListGithubReposResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/gitrepos/%d/repos", c.BaseURL, projectID, gitRepoID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &ListGithubReposResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return *bodyResp, nil
}
