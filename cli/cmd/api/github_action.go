package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// CreateGithubActionRequest represents the accepted fields for creating
// a Github action
type CreateGithubActionRequest struct {
	ReleaseID            uint   `json:"release_id" form:"required"`
	GitRepo              string `json:"git_repo" form:"required"`
	GitBranch            string `json:"git_branch"`
	ImageRepoURI         string `json:"image_repo_uri" form:"required"`
	DockerfilePath       string `json:"dockerfile_path"`
	FolderPath           string `json:"folder_path"`
	GitRepoID            uint   `json:"git_repo_id" form:"required"`
	RegistryID           uint   `json:"registry_id"`
	ShouldCreateWorkflow bool   `json:"should_create_workflow"`
}

// CreateGithubAction creates a Github action with basic authentication
func (c *Client) CreateGithubAction(
	ctx context.Context,
	projectID, clusterID uint,
	releaseName, releaseNamespace string,
	createGH *CreateGithubActionRequest,
) error {
	data, err := json.Marshal(createGH)

	if err != nil {
		return err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf(
			"%s/projects/%d/ci/actions/create?cluster_id=%d&name=%s&namespace=%s",
			c.BaseURL,
			projectID,
			clusterID,
			releaseName,
			releaseNamespace,
		),
		strings.NewReader(string(data)),
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
