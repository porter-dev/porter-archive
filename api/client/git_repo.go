package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

// ListGitInstallationIDs returns a list of Git installation IDs for a user
func (c *Client) ListGitInstallationIDs(
	ctx context.Context,
	projID uint,
) (*types.ListGitInstallationIDsResponse, error) {
	resp := &types.ListGitInstallationIDsResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos",
			projID,
		),
		nil,
		resp,
	)

	return resp, err
}

// ListGitRepos returns a list of Git installation IDs for a user
func (c *Client) ListGitRepos(
	ctx context.Context,
	projID uint,
	gitInstallationID int64,
) (*types.ListReposResponse, error) {
	resp := &types.ListReposResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos/%d/repos",
			projID,
			gitInstallationID,
		),
		nil,
		resp,
	)

	return resp, err
}

func (c *Client) GetRepoZIPDownloadURL(
	ctx context.Context,
	projID uint,
	gitInstallationID int64,
	kind, owner, name, branch string,
) (*types.GetTarballURLResponse, error) {
	resp := &types.GetTarballURLResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/gitrepos/%d/repos/%s/%s/%s/%s/tarball_url",
			projID, gitInstallationID,
			kind, owner, name, branch,
		),
		nil,
		resp,
	)

	return resp, err
}
