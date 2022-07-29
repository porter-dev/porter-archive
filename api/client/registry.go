package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

// CreateRegistry creates a new registry integration
func (c *Client) CreateRegistry(
	ctx context.Context,
	projectID uint,
	req *types.CreateRegistryRequest,
) (*types.Registry, error) {
	resp := &types.Registry{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/registries",
			projectID,
		),
		req,
		resp,
	)

	return resp, err
}

// CreateRegistry creates a new registry integration
func (c *Client) CreateHelmRepo(
	ctx context.Context,
	projectID uint,
	req *types.CreateHelmRepoRequest,
) (*types.HelmRepo, error) {
	resp := &types.HelmRepo{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/helmrepos",
			projectID,
		),
		req,
		resp,
	)

	return resp, err
}

// ListRegistries returns a list of registries for a project
func (c *Client) ListRegistries(
	ctx context.Context,
	projectID uint,
) (*types.RegistryListResponse, error) {
	resp := &types.RegistryListResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/registries",
			projectID,
		),
		nil,
		resp,
	)

	return resp, err
}

// DeleteProjectRegistry deletes a registry given a project id and registry id
func (c *Client) DeleteProjectRegistry(
	ctx context.Context,
	projectID uint,
	registryID uint,
) error {
	return c.deleteRequest(
		fmt.Sprintf(
			"/projects/%d/registries/%d",
			projectID,
			registryID,
		),
		nil,
		nil,
	)
}

// GetECRAuthorizationToken gets an ECR authorization token
func (c *Client) GetECRAuthorizationToken(
	ctx context.Context,
	projectID uint,
	req *types.GetRegistryECRTokenRequest,
) (*types.GetRegistryTokenResponse, error) {
	resp := &types.GetRegistryTokenResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/registries/ecr/token",
			projectID,
		),
		req,
		resp,
	)

	return resp, err
}

// GetGCRAuthorizationToken gets a GCR authorization token
func (c *Client) GetGCRAuthorizationToken(
	ctx context.Context,
	projectID uint,
	req *types.GetRegistryGCRTokenRequest,
) (*types.GetRegistryTokenResponse, error) {
	resp := &types.GetRegistryTokenResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/registries/gcr/token",
			projectID,
		),
		req,
		resp,
	)

	return resp, err
}

// GetGARAuthorizationToken gets a GAR authorization token
func (c *Client) GetGARAuthorizationToken(
	ctx context.Context,
	projectID uint,
	req *types.GetRegistryGARTokenRequest,
) (*types.GetRegistryTokenResponse, error) {
	resp := &types.GetRegistryTokenResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/registries/gar/token",
			projectID,
		),
		req,
		resp,
	)

	return resp, err
}

// GetACRAuthorizationToken gets a ACR authorization token
func (c *Client) GetACRAuthorizationToken(
	ctx context.Context,
	projectID uint,
) (*types.GetRegistryTokenResponse, error) {
	resp := &types.GetRegistryTokenResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/registries/acr/token",
			projectID,
		),
		nil,
		resp,
	)

	return resp, err
}

// GetDockerhubAuthorizationToken gets a Docker Hub authorization token
func (c *Client) GetDockerhubAuthorizationToken(
	ctx context.Context,
	projectID uint,
) (*types.GetRegistryTokenResponse, error) {
	resp := &types.GetRegistryTokenResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/registries/dockerhub/token",
			projectID,
		),
		nil,
		resp,
	)

	return resp, err
}

// GetDOCRAuthorizationToken gets a DOCR authorization token
func (c *Client) GetDOCRAuthorizationToken(
	ctx context.Context,
	projectID uint,
	req *types.GetRegistryGCRTokenRequest,
) (*types.GetRegistryTokenResponse, error) {
	resp := &types.GetRegistryTokenResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/registries/docr/token",
			projectID,
		),
		req,
		resp,
	)

	return resp, err
}

// ListRegistryRepositories lists the repositories in a registry
func (c *Client) ListRegistryRepositories(
	ctx context.Context,
	projectID uint,
	registryID uint,
) (*types.ListRegistryRepositoryResponse, error) {
	resp := &types.ListRegistryRepositoryResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/registries/%d/repositories",
			projectID,
			registryID,
		),
		nil,
		resp,
	)

	return resp, err
}

// ListImages lists the images (repository+tag) in a repository
func (c *Client) ListImages(
	ctx context.Context,
	projectID uint,
	registryID uint,
	repoName string,
) (*types.ListImageResponse, error) {
	resp := &types.ListImageResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/registries/%d/repositories/%s",
			projectID,
			registryID,
			repoName,
		),
		nil,
		resp,
	)

	return resp, err
}

func (c *Client) CreateRepository(
	ctx context.Context,
	projectID, regID uint,
	req *types.CreateRegistryRepositoryRequest,
) error {
	return c.postRequest(
		fmt.Sprintf(
			"/projects/%d/registries/%d/repository",
			projectID,
			regID,
		),
		req,
		nil,
	)
}
