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

// GetProjectClusterResponse is the response returned after querying for a
// given project's cluster
type GetProjectClusterResponse models.ClusterExternal

// GetProjectCluster retrieves a project's cluster by id
func (c *Client) GetProjectCluster(
	ctx context.Context,
	projectID uint,
	clusterID uint,
) (*GetProjectClusterResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/clusters/%d", c.BaseURL, projectID, clusterID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &GetProjectClusterResponse{}

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
	IsLocal    bool   `json:"is_local"`
}

// CreateProjectCandidatesResponse is the list of candidates returned after
// creating the candidates
type CreateProjectCandidatesResponse []*models.ClusterCandidateExternal

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
		fmt.Sprintf("%s/projects/%d/clusters/candidates", c.BaseURL, projectID),
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
type GetProjectCandidatesResponse []*models.ClusterCandidateExternal

// GetProjectCandidates returns the service account candidates for a given
// project id
func (c *Client) GetProjectCandidates(
	ctx context.Context,
	projectID uint,
) (GetProjectCandidatesResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/clusters/candidates", c.BaseURL, projectID),
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

// CreateProjectClusterResponse is the cluster that gets
// returned after the candidate has been resolved
type CreateProjectClusterResponse models.ClusterExternal

// CreateProjectCluster creates a cluster given a project id
// and a candidate id, which gets resolved using the list of actions
func (c *Client) CreateProjectCluster(
	ctx context.Context,
	projectID uint,
	candidateID uint,
	createReq *models.ClusterResolverAll,
) (*CreateProjectClusterResponse, error) {
	data, err := json.Marshal(&createReq)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects/%d/clusters/candidates/%d/resolve", c.BaseURL, projectID, candidateID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &CreateProjectClusterResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// DeleteProjectCluster deletes a cluster given a project id and cluster id
func (c *Client) DeleteProjectCluster(
	ctx context.Context,
	projectID uint,
	clusterID uint,
) error {
	req, err := http.NewRequest(
		"DELETE",
		fmt.Sprintf("%s/projects/%d/clusters/%d", c.BaseURL, projectID, clusterID),
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

// DeleteProjectResponse is the object returned after project deletion
type DeleteProjectResponse models.ProjectExternal

// DeleteProject deletes a project by id
func (c *Client) DeleteProject(ctx context.Context, projectID uint) (*DeleteProjectResponse, error) {
	req, err := http.NewRequest(
		"DELETE",
		fmt.Sprintf("%s/projects/%d", c.BaseURL, projectID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &DeleteProjectResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}
