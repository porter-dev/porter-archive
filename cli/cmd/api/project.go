package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/internal/models"
)

// GetProjectResponse is the response returned after querying for a
// given project
type GetProjectResponse models.ProjectExternal

// GetProject retrieves a project by id
func (c *Client) GetProject(ctx context.Context, projectID uint) (*GetProjectResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d", c.BaseURL, projectID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &GetProjectResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// ListProjectClustersResponse lists the linked clusters for a project
type ListProjectClustersResponse []models.ClusterExternal

// ListProjectClusters creates a list of clusters for a given project
func (c *Client) ListProjectClusters(
	ctx context.Context,
	projectID uint,
) (ListProjectClustersResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/clusters", c.BaseURL, projectID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := ListProjectClustersResponse{}

	if httpErr, err := c.sendRequest(req, &bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// CreateProjectRequest represents the accepted fields for creating a project
type CreateProjectRequest struct {
	Name string `json:"name" form:"required"`
}

// CreateProjectResponse is the resulting project after creation
type CreateProjectResponse models.ProjectExternal

// CreateProject creates a project with the given request options
func (c *Client) CreateProject(
	ctx context.Context,
	createProjectRequest *CreateProjectRequest,
) (*CreateProjectResponse, error) {
	data, err := json.Marshal(createProjectRequest)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects", c.BaseURL),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &CreateProjectResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// CreateProjectCandidatesRequest creates a project service account candidate,
// which can be resolved to create a service account
type CreateProjectCandidatesRequest struct {
	Kubeconfig string `json:"kubeconfig"`
}

// CreateProjectCandidatesResponse is the list of candidates returned after
// creating the candidates
type CreateProjectCandidatesResponse []*models.ServiceAccountCandidateExternal

// CreateProjectCandidates creates a service account candidate for a given project,
// accepting a kubeconfig that gets parsed into a candidate
func (c *Client) CreateProjectCandidates(
	ctx context.Context,
	projectID uint,
	createCandidatesRequest *CreateProjectCandidatesRequest,
) (CreateProjectCandidatesResponse, error) {
	data, err := json.Marshal(createCandidatesRequest)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects/%d/candidates", c.BaseURL, projectID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := CreateProjectCandidatesResponse{}

	if httpErr, err := c.sendRequest(req, &bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// GetProjectCandidatesResponse is the list of service account candidates
type GetProjectCandidatesResponse []*models.ServiceAccountCandidateExternal

// GetProjectCandidates returns the service account candidates for a given
// project id
func (c *Client) GetProjectCandidates(
	ctx context.Context,
	projectID uint,
) (GetProjectCandidatesResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/candidates", c.BaseURL, projectID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := GetProjectCandidatesResponse{}

	if httpErr, err := c.sendRequest(req, &bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// CreateProjectServiceAccountRequest is a list of service account actions,
// which resolve a given service account
type CreateProjectServiceAccountRequest []*models.ServiceAccountAllActions

// CreateProjectServiceAccountResponse is the service account that gets
// returned after the actions have been resolved
type CreateProjectServiceAccountResponse models.ServiceAccountExternal

// CreateProjectServiceAccount creates a service account given a project id
// and a candidate id, which gets resolved using the list of actions
func (c *Client) CreateProjectServiceAccount(
	ctx context.Context,
	projectID uint,
	candidateID uint,
	createSARequest CreateProjectServiceAccountRequest,
) (*CreateProjectServiceAccountResponse, error) {
	data, err := json.Marshal(&createSARequest)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects/%d/candidates/%d/resolve", c.BaseURL, projectID, candidateID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &CreateProjectServiceAccountResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}
