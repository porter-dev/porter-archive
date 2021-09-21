package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

// GetProject retrieves a project by id
func (c *Client) GetProject(
	ctx context.Context,
	projectID uint,
) (*types.ReadProjectResponse, error) {
	resp := &types.ReadProjectResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d",
			projectID,
		),
		nil,
		resp,
	)

	return resp, err
}

// GetProjectCluster retrieves a project's cluster by id
func (c *Client) GetProjectCluster(
	ctx context.Context,
	projectID uint,
	clusterID uint,
) (*types.ClusterGetResponse, error) {
	resp := &types.ClusterGetResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d",
			projectID, clusterID,
		),
		nil,
		resp,
	)

	return resp, err
}

// ListProjectClusters creates a list of clusters for a given project
func (c *Client) ListProjectClusters(
	ctx context.Context,
	projectID uint,
) (*types.ListClusterResponse, error) {
	resp := &types.ListClusterResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters",
			projectID,
		),
		nil,
		resp,
	)

	return resp, err
}

// CreateProject creates a project with the given request options
func (c *Client) CreateProject(
	ctx context.Context,
	req *types.CreateProjectRequest,
) (*types.CreateProjectResponse, error) {
	resp := &types.CreateProjectResponse{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects",
		),
		req,
		resp,
	)

	return resp, err
}

// CreateProjectCandidates creates a service account candidate for a given project,
// accepting a kubeconfig that gets parsed into a candidate
func (c *Client) CreateProjectCandidates(
	ctx context.Context,
	projectID uint,
	req *types.CreateClusterCandidateRequest,
) (*types.CreateClusterCandidateResponse, error) {
	resp := &types.CreateClusterCandidateResponse{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/candidates",
			projectID,
		),
		req,
		resp,
	)

	return resp, err
}

// GetProjectCandidates returns the cluster candidates for a given
// project id
func (c *Client) GetProjectCandidates(
	ctx context.Context,
	projectID uint,
) (*types.ListClusterCandidateResponse, error) {
	resp := &types.ListClusterCandidateResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/candidates",
			projectID,
		),
		nil,
		resp,
	)

	return resp, err
}

// CreateProjectCluster creates a cluster given a project id
// and a candidate id, which gets resolved using the list of actions
func (c *Client) CreateProjectCluster(
	ctx context.Context,
	projectID, candidateID uint,
	req *types.ClusterResolverAll,
) (*types.Cluster, error) {
	resp := &types.Cluster{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/candidates/%d/resolve",
			projectID,
			candidateID,
		),
		req,
		resp,
	)

	return resp, err
}

// DeleteProjectCluster deletes a cluster given a project id and cluster id
func (c *Client) DeleteProjectCluster(
	ctx context.Context,
	projectID uint,
	clusterID uint,
) error {
	return c.deleteRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d",
			projectID,
			clusterID,
		),
		nil,
		nil,
	)
}

// // DeleteProject deletes a project by id
func (c *Client) DeleteProject(
	ctx context.Context,
	projectID uint,
) error {
	return c.deleteRequest(
		fmt.Sprintf(
			"/projects/%d",
			projectID,
		),
		nil,
		nil,
	)
}
